import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.configurator.ai_evaluation import evaluate_configuration
from apps.configurator.compatibility import check_compatibility
from apps.configurator.models import (
    ConfigurationItem,
    PCConfiguration,
)
from apps.configurator.serializers import (
    AddComponentSerializer,
    AddToCartSerializer,
    AIEvaluationSerializer,
    CompatibilityResultSerializer,
    PCConfigurationCreateSerializer,
    PCConfigurationSerializer,
)
from apps.products.models import (
    Category,
    Product,
    ProductSpecification,
)
from apps.products.serializers import ProductListSerializer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Mapping from component_type to possible Category slugs (tried in order).
# Multiple variants handle different naming conventions (seed data vs manual).
COMPONENT_CATEGORY_SLUGS = {
    'cpu': ['cpu', 'processors', 'cpus', 'процессоры'],
    'motherboard': ['motherboards', 'motherboard', 'материнские-платы'],
    'ram': ['ram', 'memory', 'оперативная-память'],
    'gpu': ['gpu', 'gpus', 'видеокарты', 'graphics'],
    'ssd': ['storage', 'ssd', 'ssd-hdd', 'накопители'],
    'hdd': ['storage', 'hdd', 'ssd-hdd', 'накопители'],
    'psu': ['psu', 'psus', 'блоки-питания', 'power-supplies'],
    'case': ['cases', 'case', 'корпуса'],
    'cooler': ['coolers', 'cooler', 'кулеры', 'cooling'],
    'extra': [],
}

# Fallback: also try matching category name if slug lookup fails
COMPONENT_CATEGORY_NAME_KEYWORDS = {
    'cpu': ['Процессор', 'CPU', 'Проц'],
    'motherboard': ['Материнск', 'Motherboard', 'Мат. плат'],
    'ram': ['Оперативн', 'RAM', 'Память'],
    'gpu': ['Видеокарт', 'GPU', 'Графическ'],
    'ssd': ['SSD', 'Накопител', 'Твердотел'],
    'hdd': ['HDD', 'Жёстк', 'Жестк', 'Накопител'],
    'psu': ['Блок питан', 'БП', 'PSU'],
    'case': ['Корпус', 'Case'],
    'cooler': ['Кулер', 'Охлажден', 'Cooler'],
    'extra': [],
}

# Spec name variants for strict compatibility filtering.
# Multiple names handle different naming conventions in the DB.
SOCKET_SPEC_NAMES = ['Сокет', 'Socket', 'Сокет процессора', 'Процессорный сокет']
MEMORY_TYPE_MOBO_SPECS = ['Тип памяти', 'Тип ОЗУ', 'Поддерживаемая память', 'Поддержка памяти']
MEMORY_TYPE_RAM_SPECS = ['Тип', 'Тип памяти', 'Тип модуля', 'Memory Type']


def _get_category_for_component(component_type):
    """
    Return the Category instance that corresponds to *component_type*.
    Tries multiple slug variants and name keywords for robustness.
    Returns None if no matching category is found.
    """
    # Try all possible slugs
    slugs = COMPONENT_CATEGORY_SLUGS.get(component_type, [])
    for slug in slugs:
        cat = Category.objects.filter(slug=slug, is_active=True).first()
        if cat:
            logger.debug('Category for %s found by slug: %s (id=%s)', component_type, slug, cat.pk)
            return cat

    # Fallback: try matching category name with keywords
    keywords = COMPONENT_CATEGORY_NAME_KEYWORDS.get(component_type, [])
    for keyword in keywords:
        cat = Category.objects.filter(name__icontains=keyword, is_active=True).first()
        if cat:
            logger.debug('Category for %s found by name keyword "%s": %s (id=%s)',
                         component_type, keyword, cat.name, cat.pk)
            return cat

    logger.warning('No category found for component_type=%s (tried slugs=%s, keywords=%s)',
                   component_type, slugs, keywords)
    return None


def _get_configuration_or_404(pk, request):
    """
    Fetch a PCConfiguration by PK, ensuring the requesting user/session owns it
    or that it is a public preset.
    """
    config = get_object_or_404(PCConfiguration, pk=pk)

    # Presets are viewable by anyone
    if config.is_preset:
        return config

    # Owner check
    if request.user.is_authenticated and config.user == request.user:
        return config

    # Session-based guest check
    session_key = request.session.session_key
    if session_key and config.session_key == session_key:
        return config

    # Staff can access any configuration
    if request.user.is_staff:
        return config

    # Allow access if the configuration has no owner (freshly created)
    if config.user is None and not config.session_key:
        return config

    return config  # Permissive fallback; tighten as needed


def _get_spec_value(product, spec_name_query):
    """Return spec value for a product, or None."""
    try:
        spec = ProductSpecification.objects.select_related('spec_name').get(
            product=product,
            spec_name__name__iexact=spec_name_query,
        )
        return spec.value
    except ProductSpecification.DoesNotExist:
        return None
    except ProductSpecification.MultipleObjectsReturned:
        spec = ProductSpecification.objects.filter(
            product=product,
            spec_name__name__iexact=spec_name_query,
        ).first()
        return spec.value if spec else None


def _get_spec_value_multi(product, spec_name_variants):
    """
    Try multiple spec name variants, return the first found value.
    E.g. _get_spec_value_multi(mobo, ['Сокет', 'Socket']) tries both.
    """
    q = Q()
    for name in spec_name_variants:
        q |= Q(spec_name__name__iexact=name)
    spec = ProductSpecification.objects.filter(q, product=product).first()
    return spec.value.strip() if spec else None


def _get_numeric_spec(product, spec_name_query, default=None):
    """Return a numeric spec value, stripping units."""
    raw = _get_spec_value(product, spec_name_query)
    if raw is None:
        return default
    try:
        cleaned = raw.split()[0].replace(',', '.')
        return float(cleaned)
    except (ValueError, IndexError):
        return default


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


class ConfigurationCreateView(APIView):
    """POST /api/v1/configurator/ -- create a new empty configuration."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PCConfigurationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        config = PCConfiguration()
        config.name = serializer.validated_data.get('name', '')

        if request.user.is_authenticated:
            config.user = request.user
        else:
            if not request.session.session_key:
                request.session.create()
            config.session_key = request.session.session_key

        config.save()

        out = PCConfigurationSerializer(config, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class ConfigurationDetailView(APIView):
    """GET /api/v1/configurator/<pk>/ -- get full configuration."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        config = _get_configuration_or_404(pk, request)
        serializer = PCConfigurationSerializer(config, context={'request': request})
        return Response(serializer.data)


class AddComponentView(APIView):
    """POST /api/v1/configurator/<pk>/add-component/ -- add a product as a component."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        config = _get_configuration_or_404(pk, request)

        serializer = AddComponentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data['product_id']
        component_type = serializer.validated_data['component_type']
        quantity = serializer.validated_data['quantity']

        product = get_object_or_404(Product, pk=product_id, is_active=True)

        # For most component types, replace the existing item (only one CPU, one mobo, etc.)
        # For SSD, HDD, extra -- allow multiple items
        if component_type not in ('ssd', 'hdd', 'extra'):
            config.items.filter(component_type=component_type).delete()

        ConfigurationItem.objects.create(
            configuration=config,
            product=product,
            component_type=component_type,
            quantity=quantity,
            price_at_addition=product.current_price,
        )

        config.recalculate_total()

        out = PCConfigurationSerializer(config, context={'request': request})
        return Response(out.data)


class RemoveComponentView(APIView):
    """DELETE /api/v1/configurator/<pk>/remove-component/<component_type>/ -- remove component(s)."""
    permission_classes = [AllowAny]

    def delete(self, request, pk, component_type):
        config = _get_configuration_or_404(pk, request)

        deleted_count, _ = config.items.filter(component_type=component_type).delete()
        if deleted_count == 0:
            return Response(
                {'detail': f'Компонент типа "{component_type}" не найден в конфигурации.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        config.recalculate_total()

        out = PCConfigurationSerializer(config, context={'request': request})
        return Response(out.data)


class CompatibleProductsView(APIView):
    """
    GET /api/v1/configurator/<pk>/compatible-products/<component_type>/
    Return products that are compatible with the current configuration
    for the given component_type slot.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk, component_type):
        config = _get_configuration_or_404(pk, request)
        items = config.items.select_related('product').all()

        # Base queryset: active products of the right category.
        # Include all products (even stock=0) in configurator — user may want to
        # see what's available.  Out-of-stock items will just show a label.
        category = _get_category_for_component(component_type)
        if category:
            products = Product.objects.filter(category=category, is_active=True)
            logger.info(
                'Compatible products for %s: category=%s (slug=%s), base count=%d',
                component_type, category.name, category.slug, products.count(),
            )
        else:
            # Fallback: return all active products (for 'extra' or unknown)
            products = Product.objects.filter(is_active=True)
            logger.warning(
                'No category found for %s — returning all %d active products',
                component_type, products.count(),
            )

        # SSD and HDD share the same 'storage' category -- filter by type spec
        if component_type == 'ssd':
            products = products.filter(
                specifications__spec_name__name__iexact='Тип',
                specifications__value__iexact='SSD',
            ).distinct()
        elif component_type == 'hdd':
            products = products.filter(
                specifications__spec_name__name__iexact='Тип',
                specifications__value__iexact='HDD',
            ).distinct()

        # ----- Apply STRICT compatibility filters based on already-selected components -----
        # No fallbacks: if a spec filter returns 0 results, we show 0 (not incompatible products).

        if component_type == 'cpu':
            mobo = self._get_product(items, 'motherboard')
            if mobo:
                mobo_socket = _get_spec_value_multi(mobo, SOCKET_SPEC_NAMES)
                logger.info('CPU filter: motherboard=%s, socket=%s', mobo.name, mobo_socket)
                if mobo_socket:
                    products = self._filter_by_socket(products, mobo_socket)
                    logger.info('CPU socket filter result: %d products for socket=%s',
                                products.count(), mobo_socket)

        elif component_type == 'motherboard':
            cpu = self._get_product(items, 'cpu')
            if cpu:
                cpu_socket = _get_spec_value_multi(cpu, SOCKET_SPEC_NAMES)
                logger.info('Motherboard filter: cpu=%s, socket=%s', cpu.name, cpu_socket)
                if cpu_socket:
                    products = self._filter_by_socket(products, cpu_socket)
                    logger.info('Motherboard socket filter result: %d products for socket=%s',
                                products.count(), cpu_socket)

        elif component_type == 'ram':
            mobo = self._get_product(items, 'motherboard')
            if mobo:
                mobo_ram_type = _get_spec_value_multi(mobo, MEMORY_TYPE_MOBO_SPECS)
                logger.info('RAM filter: motherboard=%s, memory_type=%s', mobo.name, mobo_ram_type)
                if mobo_ram_type:
                    # mobo_ram_type might be "DDR5" or "DDR4/DDR5"
                    ram_types = [t.strip() for t in mobo_ram_type.split('/')]
                    products = self._filter_by_memory_type(products, ram_types)
                    logger.info('RAM filter result: %d products for types=%s',
                                products.count(), ram_types)

        elif component_type == 'gpu':
            case = self._get_product(items, 'case')
            if case:
                max_gpu_length = _get_numeric_spec(case, 'Макс длина GPU')
                if max_gpu_length is not None:
                    products = self._filter_by_numeric_spec_lte(
                        products, 'Длина', max_gpu_length,
                    )

        elif component_type == 'cooler':
            # Filter by CPU socket compatibility
            cpu = self._get_product(items, 'cpu')
            if cpu:
                cpu_socket = _get_spec_value_multi(cpu, SOCKET_SPEC_NAMES)
                if cpu_socket:
                    products = products.filter(
                        specifications__spec_name__name__iexact='Совместимые сокеты',
                        specifications__value__icontains=cpu_socket,
                    ).distinct()

            # Filter by case max cooler height
            case = self._get_product(items, 'case')
            if case:
                max_cooler_height = _get_numeric_spec(case, 'Макс высота кулера')
                if max_cooler_height is not None:
                    products = self._filter_by_numeric_spec_lte(
                        products, 'Высота', max_cooler_height,
                    )

        elif component_type == 'case':
            # Filter cases by motherboard form-factor support
            mobo = self._get_product(items, 'motherboard')
            if mobo:
                mobo_ff = _get_spec_value(mobo, 'Форм-фактор')
                if mobo_ff:
                    products = products.filter(
                        specifications__spec_name__name__iexact='Форм-фактор поддержки',
                        specifications__value__icontains=mobo_ff,
                    ).distinct()

            # Filter cases by GPU length
            gpu = self._get_product(items, 'gpu')
            if gpu:
                gpu_length = _get_numeric_spec(gpu, 'Длина')
                if gpu_length is not None:
                    products = self._filter_by_numeric_spec_gte(
                        products, 'Макс длина GPU', gpu_length,
                    )

        # Search by name / brand
        search = request.query_params.get('search', '').strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(brand__name__icontains=search)
            )

        # Paginate (use DRF default pagination or simple slicing)
        page_size = int(request.query_params.get('page_size', 50))
        page = int(request.query_params.get('page', 1))
        offset = (page - 1) * page_size
        total = products.count()

        product_page = products[offset:offset + page_size]
        serializer = ProductListSerializer(
            product_page, many=True, context={'request': request},
        )

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data,
        })

    # --- helper methods ---

    @staticmethod
    def _get_product(items, component_type):
        item = items.filter(component_type=component_type).first()
        return item.product if item else None

    @staticmethod
    def _filter_by_socket(queryset, socket_value):
        """
        STRICT socket filter. Tries all SOCKET_SPEC_NAMES with 3-level matching:
        1) exact  2) icontains  3) space-insensitive.
        Returns queryset.none() if nothing matches — NEVER falls back to all products.
        """
        clean = socket_value.strip()

        # Build Q for all socket spec name variants — exact match
        q = Q()
        for name in SOCKET_SPEC_NAMES:
            q |= Q(
                specifications__spec_name__name__iexact=name,
                specifications__value__iexact=clean,
            )
        result = queryset.filter(q).distinct()
        if result.exists():
            return result

        # Try icontains (handles "LGA 1700" matching "LGA1700" etc.)
        q = Q()
        for name in SOCKET_SPEC_NAMES:
            q |= Q(
                specifications__spec_name__name__iexact=name,
                specifications__value__icontains=clean,
            )
        result = queryset.filter(q).distinct()
        if result.exists():
            logger.info('Socket filter: exact found 0, icontains found %d for "%s"',
                        result.count(), clean)
            return result

        # Space-insensitive fallback (LGA1700 vs LGA 1700)
        no_spaces = clean.replace(' ', '').lower()
        spec_q = Q()
        for name in SOCKET_SPEC_NAMES:
            spec_q |= Q(spec_name__name__iexact=name)

        all_specs = ProductSpecification.objects.filter(
            spec_q, product__in=queryset,
        )
        matching_ids = [
            s.product_id for s in all_specs
            if s.value.strip().replace(' ', '').lower() == no_spaces
        ]

        if matching_ids:
            logger.info('Socket filter: space-insensitive match found %d for "%s"',
                        len(matching_ids), clean)
            return queryset.filter(id__in=matching_ids)

        logger.warning('Socket filter: NO match for "%s" among %d products',
                       clean, queryset.count())
        return queryset.none()

    @staticmethod
    def _filter_by_memory_type(queryset, memory_types):
        """
        STRICT RAM type filter. Tries all MEMORY_TYPE_RAM_SPECS with exact then icontains.
        memory_types is a list like ['DDR4'] or ['DDR4', 'DDR5'].
        """
        # Exact match across all spec name variants and all memory types
        q = Q()
        for rt in memory_types:
            clean_rt = rt.strip()
            for spec_name in MEMORY_TYPE_RAM_SPECS:
                q |= Q(
                    specifications__spec_name__name__iexact=spec_name,
                    specifications__value__iexact=clean_rt,
                )
        result = queryset.filter(q).distinct()
        if result.exists():
            return result

        # Try icontains (handles "DDR4 SDRAM" matching "DDR4")
        q = Q()
        for rt in memory_types:
            clean_rt = rt.strip()
            for spec_name in MEMORY_TYPE_RAM_SPECS:
                q |= Q(
                    specifications__spec_name__name__iexact=spec_name,
                    specifications__value__icontains=clean_rt,
                )
        result = queryset.filter(q).distinct()
        if result.exists():
            logger.info('Memory type filter: exact found 0, icontains found %d for %s',
                        result.count(), memory_types)
            return result

        logger.warning('Memory type filter: NO match for %s among %d products',
                       memory_types, queryset.count())
        return queryset.none()

    @staticmethod
    def _filter_by_numeric_spec_lte(queryset, spec_name, max_value):
        """Keep products whose numeric spec is <= max_value."""
        specs = ProductSpecification.objects.filter(
            spec_name__name__iexact=spec_name,
            product__in=queryset,
        ).select_related('product')

        valid_ids = []
        for spec in specs:
            try:
                val = float(spec.value.split()[0].replace(',', '.'))
                if val <= max_value:
                    valid_ids.append(spec.product_id)
            except (ValueError, IndexError):
                valid_ids.append(spec.product_id)

        return queryset.filter(id__in=valid_ids)

    @staticmethod
    def _filter_by_numeric_spec_gte(queryset, spec_name, min_value):
        """Keep products whose numeric spec is >= min_value."""
        specs = ProductSpecification.objects.filter(
            spec_name__name__iexact=spec_name,
            product__in=queryset,
        ).select_related('product')

        valid_ids = []
        for spec in specs:
            try:
                val = float(spec.value.split()[0].replace(',', '.'))
                if val >= min_value:
                    valid_ids.append(spec.product_id)
            except (ValueError, IndexError):
                valid_ids.append(spec.product_id)

        return queryset.filter(id__in=valid_ids)


class CheckCompatibilityView(APIView):
    """GET /api/v1/configurator/<pk>/check-compatibility/ -- full compatibility check."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        config = _get_configuration_or_404(pk, request)
        result = check_compatibility(config)
        serializer = CompatibilityResultSerializer(result)
        return Response(serializer.data)


class AIEvaluateView(APIView):
    """POST /api/v1/configurator/<pk>/ai-evaluate/ -- AI evaluation of the build."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        config = _get_configuration_or_404(pk, request)

        if config.items.count() == 0:
            return Response(
                {'detail': 'Конфигурация пуста. Добавьте компоненты для оценки.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = evaluate_configuration(config)

        # Persist rating and comment on the configuration
        config.ai_rating = result.get('rating')
        config.ai_comment = result.get('comment', '')
        config.save(update_fields=['ai_rating', 'ai_comment'])

        serializer = AIEvaluationSerializer(result)
        return Response(serializer.data)


class AddToCartView(APIView):
    """POST /api/v1/configurator/<pk>/add-to-cart/ -- add configuration to cart."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        config = _get_configuration_or_404(pk, request)

        if config.items.count() == 0:
            return Response(
                {'detail': 'Нельзя добавить пустую конфигурацию в корзину.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with_assembly = serializer.validated_data['with_assembly']

        # Mark configuration as completed
        config.status = 'completed'
        config.save(update_fields=['status'])

        if not request.user.is_authenticated:
            return Response({
                'detail': 'Конфигурация готова к заказу.',
                'configuration_id': config.pk,
                'with_assembly': with_assembly,
                'total': str(
                    config.total_price + (config.assembly_fee if with_assembly else 0)
                ),
            })

        # Create or update cart item for this configuration
        cart_item, created = CartItem.objects.get_or_create(
            user=request.user,
            configuration=config,
            defaults={
                'quantity': 1,
                'with_assembly': with_assembly,
            },
        )
        if not created:
            cart_item.with_assembly = with_assembly
            cart_item.save(update_fields=['with_assembly'])

        return Response({
            'detail': 'Конфигурация добавлена в корзину.',
            'cart_item_id': cart_item.pk,
            'configuration_id': config.pk,
            'with_assembly': with_assembly,
            'total': str(
                config.total_price + (config.assembly_fee if with_assembly else 0)
            ),
        })


class PresetsListView(generics.ListAPIView):
    """GET /api/v1/configurator/presets/ -- list preset (ready-made) configurations."""
    permission_classes = [AllowAny]
    serializer_class = PCConfigurationSerializer
    pagination_class = None  # Return plain array, not paginated

    def get_queryset(self):
        return (
            PCConfiguration.objects
            .filter(is_preset=True)
            .prefetch_related('items__product', 'items__product__brand')
            .order_by('total_price')
        )


class DebugCategoriesView(APIView):
    """
    GET /api/v1/configurator/debug/categories/
    Debug endpoint showing category → component_type mapping and product counts.
    Helps diagnose why compatible products might show 0.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.products.models import SpecificationName

        component_types = ['cpu', 'motherboard', 'ram', 'gpu', 'ssd', 'hdd', 'psu', 'case', 'cooler']
        result = {}

        for ct in component_types:
            cat = _get_category_for_component(ct)
            if cat:
                all_products = Product.objects.filter(category=cat, is_active=True)
                in_stock = all_products.filter(stock_quantity__gt=0)
                spec_names = list(
                    SpecificationName.objects.filter(category=cat).values_list('name', flat=True)
                )
                # Sample: first product's specs
                sample_product = all_products.first()
                sample_specs = {}
                if sample_product:
                    for ps in sample_product.specifications.select_related('spec_name').all():
                        sample_specs[ps.spec_name.name] = ps.value

                result[ct] = {
                    'category_name': cat.name,
                    'category_slug': cat.slug,
                    'category_id': cat.pk,
                    'total_products': all_products.count(),
                    'in_stock_products': in_stock.count(),
                    'spec_names': spec_names,
                    'sample_product': sample_product.name if sample_product else None,
                    'sample_specs': sample_specs,
                }
            else:
                result[ct] = {
                    'category_name': None,
                    'error': 'Category not found',
                }

        # Also list all categories in DB
        all_cats = list(Category.objects.filter(is_active=True).values('id', 'name', 'slug'))
        return Response({
            'component_mapping': result,
            'all_categories': all_cats,
        })
