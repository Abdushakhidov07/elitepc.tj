import datetime
import os

from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Count, DecimalField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import BasePermission, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

# ── Custom permissions ───────────────────────────────────────────────────────

class IsFullAdmin(BasePermission):
    """Allows access only to superusers (full admin, sees financial data)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsManagerOrAdmin(BasePermission):
    """Allows access to is_staff users (managers + superusers)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


# ── Revenue-bearing order statuses ──────────────────────────────────────────
# Revenue is counted only once a payment is confirmed.
_REVENUE_STATUSES = ['paid', 'assembling', 'shipping', 'completed']

# ── Image upload validator ───────────────────────────────────────────────────

_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'}
_ALLOWED_IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
_MAX_IMAGE_SIZE = 8 * 1024 * 1024  # 8 MB


def validate_uploaded_image(file):
    """Validate size, content-type and extension of an uploaded image file."""
    if file is None:
        return
    if file.size > _MAX_IMAGE_SIZE:
        raise DRFValidationError('Файл слишком большой. Максимальный размер — 8 МБ.')
    content_type = getattr(file, 'content_type', '')
    if content_type and content_type.lower() not in _ALLOWED_IMAGE_TYPES:
        raise DRFValidationError(f'Недопустимый тип файла: {content_type}. Разрешены JPEG, PNG, WebP, GIF.')
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in _ALLOWED_IMAGE_EXTS:
        raise DRFValidationError(f'Недопустимое расширение файла: {ext}. Разрешены .jpg .jpeg .png .webp .gif')


def paginate_queryset(request, queryset, serializer_class, *, default_page_size=25, max_page_size=100, context=None):
    try:
        page = max(int(request.query_params.get('page', 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get('page_size', default_page_size))
    except (TypeError, ValueError):
        page_size = default_page_size
    page_size = max(1, min(page_size, max_page_size))

    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)
    serializer = serializer_class(
        page_obj.object_list,
        many=True,
        context=context or {},
    )
    return Response({
        'count': paginator.count,
        'page': page_obj.number,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'next': page_obj.next_page_number() if page_obj.has_next() else None,
        'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'results': serializer.data,
    })

from apps.analytics.serializers import (
    AdminBrandListSerializer,
    AdminBrandCreateUpdateSerializer,
    AdminCategorySerializer,
    AdminCategoryTreeSerializer,
    AdminHeroSlideSerializer,
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    AdminPresetItemSerializer,
    AdminPresetItemWriteSerializer,
    AdminPresetSerializer,
    AdminProductCreateUpdateSerializer,
    AdminProductDetailSerializer,
    AdminProductImageSerializer,
    AdminProductListSerializer,
    AdminProductSpecSerializer,
    AdminProductUpdateSerializer,
    AdminSpecificationNameSerializer,
    NotificationSettingsSerializer,
    SiteSettingsAdminSerializer,
    TelegramChatSerializer,
)


class DashboardAPIView(APIView):
    """Full financial dashboard — superusers only."""
    permission_classes = [IsFullAdmin]
    _CACHE_TTL = 60  # seconds

    def get(self, request):
        from apps.orders.models import Order
        from apps.products.models import Product
        from apps.users.models import User

        today = timezone.now().date()
        cache_key = f'dashboard_{today.isoformat()}'
        cached = cache.get(cache_key)
        if cached:
            # Revenue and order count for today change frequently — always refresh
            today_live = Order.objects.filter(
                created_at__date=today,
                status__in=_REVENUE_STATUSES,
            ).aggregate(count=Count('id'), revenue=Sum('total_price'))
            cached['orders_today'] = Order.objects.filter(created_at__date=today).aggregate(
                count=Count('id')
            )['count'] or 0
            cached['revenue_today'] = float(today_live['revenue'] or 0)
            return Response(cached)

        # Orders placed today (all statuses — count)
        orders_today_count = Order.objects.filter(created_at__date=today).aggregate(
            count=Count('id')
        )['count'] or 0

        # Revenue today — only from paid/confirmed-payment statuses
        revenue_today = Order.objects.filter(
            created_at__date=today,
            status__in=_REVENUE_STATUSES,
        ).aggregate(revenue=Sum('total_price'))['revenue'] or 0

        # 30-day sales: count all orders, revenue only from paid+ statuses
        thirty_days_ago = today - datetime.timedelta(days=29)
        # All orders by day for the count
        all_sales_qs = (
            Order.objects.filter(created_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
        )
        all_sales_map = {row['day']: row['count'] for row in all_sales_qs}
        # Revenue by day — paid+ only
        revenue_sales_qs = (
            Order.objects.filter(
                created_at__date__gte=thirty_days_ago,
                status__in=_REVENUE_STATUSES,
            )
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(revenue=Sum('total_price'))
        )
        revenue_sales_map = {row['day']: float(row['revenue'] or 0) for row in revenue_sales_qs}

        daily_sales = []
        for i in range(30):
            day = today - datetime.timedelta(days=29 - i)
            daily_sales.append({
                'date': day.isoformat(),
                'orders': all_sales_map.get(day, 0),
                'revenue': revenue_sales_map.get(day, 0.0),
            })

        status_dist = dict(
            Order.objects.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        recent_orders = list(
            Order.objects.order_by('-created_at')[:10].values(
                'id', 'order_number', 'status', 'customer_name',
                'customer_phone', 'total_price', 'created_at',
            )
        )

        low_stock = list(
            Product.objects.filter(
                is_active=True,
                stock_quantity__gt=0,
                stock_quantity__lte=5,
            ).values('id', 'name', 'sku', 'stock_quantity')[:10]
        )

        data = {
            'orders_today': orders_today_count,
            'revenue_today': float(revenue_today),
            'new_customers': User.objects.filter(date_joined__date=today).count(),
            'total_products': Product.objects.filter(is_active=True).count(),
            'daily_sales': daily_sales,
            'status_distribution': status_dist,
            'recent_orders': recent_orders,
            'low_stock_products': low_stock,
        }
        cache.set(cache_key, data, self._CACHE_TTL)
        return Response(data)


class ManagerDashboardAPIView(APIView):
    """Lightweight dashboard for managers (is_staff) — no revenue data."""
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        from apps.orders.models import Order
        from apps.products.models import Product

        today = timezone.now().date()

        orders_today = Order.objects.filter(created_at__date=today).aggregate(
            count=Count('id')
        )['count'] or 0

        orders_new = Order.objects.filter(status='new').count()

        status_dist = dict(
            Order.objects.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        recent_orders = list(
            Order.objects.order_by('-created_at')[:10].values(
                'id', 'order_number', 'status', 'customer_name',
                'customer_phone', 'created_at',
            )
        )

        low_stock = list(
            Product.objects.filter(
                is_active=True,
                stock_quantity__gt=0,
                stock_quantity__lte=5,
            ).values('id', 'name', 'sku', 'stock_quantity')[:10]
        )

        return Response({
            'orders_today': orders_today,
            'orders_new': orders_new,
            'total_products': Product.objects.filter(is_active=True).count(),
            'status_distribution': status_dist,
            'recent_orders': recent_orders,
            'low_stock_products': low_stock,
        })


class AnalyticsReportView(APIView):
    """
    GET /api/v1/admin/analytics/?period=month
    GET /api/v1/admin/analytics/?period=custom&start=2024-01-01&end=2024-01-31
    Full financial analytics report — superusers only.
    """
    permission_classes = [IsFullAdmin]

    _LINE_TOTAL = ExpressionWrapper(
        (F('price_at_purchase') + F('assembly_fee')) * F('quantity'),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    def get(self, request):
        from apps.orders.models import Order, OrderItem

        today = timezone.now().date()
        period = request.query_params.get('period', 'month')

        if period == 'today':
            start_date = today
            end_date = today
        elif period == 'week':
            start_date = today - datetime.timedelta(days=6)
            end_date = today
        elif period == 'year':
            start_date = today.replace(month=1, day=1)
            end_date = today
        elif period == 'custom':
            try:
                start_date = datetime.date.fromisoformat(
                    request.query_params.get('start', '')
                )
                end_date = datetime.date.fromisoformat(
                    request.query_params.get('end', '')
                )
                if start_date > end_date:
                    start_date, end_date = end_date, start_date
            except (ValueError, TypeError):
                return Response(
                    {'detail': 'Неверный формат даты. Используйте YYYY-MM-DD.'},
                    status=400,
                )
        else:  # month
            start_date = today.replace(day=1)
            end_date = today

        # ── Base querysets ────────────────────────────────────────────────
        all_orders = Order.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        )
        revenue_orders = all_orders.filter(status__in=_REVENUE_STATUSES)
        cancelled_orders = all_orders.filter(status='cancelled')

        # ── Summary ───────────────────────────────────────────────────────
        total_count = all_orders.count()
        revenue_agg = revenue_orders.aggregate(
            total=Sum('total_price'), count=Count('id')
        )
        revenue_total = float(revenue_agg['total'] or 0)
        revenue_count = revenue_agg['count'] or 0
        avg_order = round(revenue_total / revenue_count, 2) if revenue_count > 0 else 0

        cancelled_agg = cancelled_orders.aggregate(
            count=Count('id'), lost=Sum('total_price')
        )
        cancelled_count = cancelled_agg['count'] or 0
        cancelled_lost = float(cancelled_agg['lost'] or 0)
        cancellation_rate = round(
            cancelled_count / total_count * 100, 1
        ) if total_count > 0 else 0.0

        # ── Status distribution ───────────────────────────────────────────
        status_dist = dict(
            all_orders.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        # ── Delivery breakdown (paid+ only) ────────────────────────────────
        delivery_breakdown = {
            row['delivery_method']: {
                'count': row['count'],
                'revenue': float(row['revenue'] or 0),
            }
            for row in (
                revenue_orders
                .values('delivery_method')
                .annotate(count=Count('id'), revenue=Sum('total_price'))
            )
        }

        # ── Daily breakdown ────────────────────────────────────────────────
        daily_all_map = {
            row['day']: row['count']
            for row in (
                all_orders
                .annotate(day=TruncDate('created_at'))
                .values('day')
                .annotate(count=Count('id'))
            )
        }
        daily_revenue_map = {
            row['day']: float(row['revenue'] or 0)
            for row in (
                revenue_orders
                .annotate(day=TruncDate('created_at'))
                .values('day')
                .annotate(revenue=Sum('total_price'))
            )
        }
        daily_cancelled_map = {
            row['day']: row['count']
            for row in (
                cancelled_orders
                .annotate(day=TruncDate('created_at'))
                .values('day')
                .annotate(count=Count('id'))
            )
        }

        num_days = (end_date - start_date).days + 1
        daily_breakdown = []
        for i in range(num_days):
            day = start_date + datetime.timedelta(days=i)
            daily_breakdown.append({
                'date': day.isoformat(),
                'orders': daily_all_map.get(day, 0),
                'revenue': daily_revenue_map.get(day, 0.0),
                'cancelled': daily_cancelled_map.get(day, 0),
            })

        # ── Top products by revenue ────────────────────────────────────────
        top_by_revenue = list(
            OrderItem.objects.filter(
                order__in=revenue_orders,
                product__isnull=False,
            )
            .values('product__id', 'product__name', 'product__sku')
            .annotate(
                quantity_sold=Sum('quantity'),
                revenue=Sum(self._LINE_TOTAL),
            )
            .order_by('-revenue')[:10]
        )

        # ── Top products by quantity ───────────────────────────────────────
        top_by_quantity = list(
            OrderItem.objects.filter(
                order__in=revenue_orders,
                product__isnull=False,
            )
            .values('product__id', 'product__name', 'product__sku')
            .annotate(
                quantity_sold=Sum('quantity'),
                revenue=Sum(self._LINE_TOTAL),
            )
            .order_by('-quantity_sold')[:10]
        )

        # ── Recent cancelled orders ────────────────────────────────────────
        recent_cancelled = list(
            cancelled_orders.order_by('-created_at')[:10].values(
                'id', 'order_number', 'customer_name', 'customer_phone',
                'total_price', 'created_at', 'delivery_method',
            )
        )

        return Response({
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': num_days,
            },
            'summary': {
                'total_orders': total_count,
                'revenue_total': revenue_total,
                'revenue_orders_count': revenue_count,
                'avg_order_value': avg_order,
                'cancelled_count': cancelled_count,
                'cancelled_revenue_lost': cancelled_lost,
                'cancellation_rate': cancellation_rate,
            },
            'status_distribution': status_dist,
            'delivery_breakdown': delivery_breakdown,
            'daily_breakdown': daily_breakdown,
            'top_by_revenue': [
                {
                    'id': p['product__id'],
                    'name': p['product__name'],
                    'sku': p['product__sku'],
                    'quantity_sold': p['quantity_sold'],
                    'revenue': float(p['revenue'] or 0),
                }
                for p in top_by_revenue
            ],
            'top_by_quantity': [
                {
                    'id': p['product__id'],
                    'name': p['product__name'],
                    'sku': p['product__sku'],
                    'quantity_sold': p['quantity_sold'],
                    'revenue': float(p['revenue'] or 0),
                }
                for p in top_by_quantity
            ],
            'recent_cancelled': recent_cancelled,
        })


class AdminOrderListView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        from apps.orders.models import Order

        orders = Order.objects.annotate(
            items_count=Count('items')
        ).order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)

        search = request.query_params.get('search', '').strip()
        if search:
            orders = orders.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_phone__icontains=search) |
                Q(customer_email__icontains=search)
            )

        return paginate_queryset(
            request,
            orders,
            AdminOrderListSerializer,
            default_page_size=25,
        )


class AdminOrderDetailView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request, pk):
        from apps.orders.models import Order

        order = get_object_or_404(
            Order.objects.prefetch_related(
                'items__product',
                'items__configuration',
                'status_history__changed_by',
            ),
            pk=pk,
        )
        serializer = AdminOrderDetailSerializer(order, context={'request': request})
        return Response(serializer.data)


class AdminProductListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.models import Product

        products = Product.objects.select_related('category', 'brand').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )

        category = request.query_params.get('category')
        if category:
            products = products.filter(category_id=category)

        category_slug = request.query_params.get('category_slug', '').strip()
        if category_slug:
            from apps.products.models import Category
            slugs = [s.strip() for s in category_slug.split(',') if s.strip()]
            products = products.filter(category__slug__in=slugs)

        return paginate_queryset(
            request,
            products,
            AdminProductListSerializer,
            default_page_size=25,
            context={'request': request},
        )


class AdminProductUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.products.models import Product

        product = get_object_or_404(Product, pk=pk)
        serializer = AdminProductUpdateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminProductListSerializer(product, context={'request': request}).data)


class TelegramChatListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.notifications.models import TelegramChat

        chats = TelegramChat.objects.all().order_by('-registered_at')
        serializer = TelegramChatSerializer(chats, many=True)
        return Response(serializer.data)


class TelegramChatUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.notifications.models import TelegramChat

        chat = get_object_or_404(TelegramChat, pk=pk)
        serializer = TelegramChatSerializer(chat, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TelegramChatSerializer(chat).data)

    def delete(self, request, pk):
        from apps.notifications.models import TelegramChat

        chat = get_object_or_404(TelegramChat, pk=pk)
        chat.delete()
        return Response(status=204)


class AdminSettingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.notifications.models import NotificationSettings

        ns = NotificationSettings.get_settings()
        serializer = NotificationSettingsSerializer(ns)
        return Response(serializer.data)

    def put(self, request):
        from apps.notifications.models import NotificationSettings

        ns = NotificationSettings.get_settings()
        serializer = NotificationSettingsSerializer(ns, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(NotificationSettingsSerializer(ns).data)


class AdminCompanySettingsView(APIView):
    """
    GET   /api/v1/admin/company-settings/  — retrieve company settings
    PATCH /api/v1/admin/company-settings/  — partial update
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.models import SiteSettings
        obj = SiteSettings.get_settings()
        return Response(SiteSettingsAdminSerializer(obj).data)

    def patch(self, request):
        from apps.products.models import SiteSettings
        obj = SiteSettings.get_settings()
        serializer = SiteSettingsAdminSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        obj.refresh_from_db()
        return Response(SiteSettingsAdminSerializer(obj).data)


# ═══════════════════════════════════════════════════════════
#  Categories CRUD
# ═══════════════════════════════════════════════════════════

class AdminCategoryListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        from apps.products.models import Category

        categories = (
            Category.objects
            .select_related('parent')
            .annotate(
                children_count=Count('children', distinct=True),
                products_count=Count('products', distinct=True),
            )
            .order_by('tree_id', 'lft')
        )
        serializer = AdminCategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        validate_uploaded_image(request.FILES.get('image'))
        serializer = AdminCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminCategorySerializer(serializer.instance, context={'request': request}).data, status=201)


class AdminCategoryDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        from apps.products.models import Category

        category = get_object_or_404(Category, pk=pk)
        return Response(AdminCategorySerializer(category, context={'request': request}).data)

    def patch(self, request, pk):
        from apps.products.models import Category

        validate_uploaded_image(request.FILES.get('image'))
        category = get_object_or_404(Category, pk=pk)
        serializer = AdminCategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminCategorySerializer(category, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.products.models import Category

        category = get_object_or_404(Category, pk=pk)
        if category.products.exists():
            return Response(
                {'detail': f'Нельзя удалить: в категории {category.products.count()} товар(ов).'},
                status=400,
            )
        category.delete()
        return Response(status=204)


class AdminCategoryTreeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.models import Category

        categories = Category.objects.all().order_by('tree_id', 'lft')
        serializer = AdminCategoryTreeSerializer(categories, many=True)
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════
#  Brands CRUD
# ═══════════════════════════════════════════════════════════

class AdminBrandListView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        from apps.products.models import Brand

        brands = Brand.objects.all().order_by('name')
        serializer = AdminBrandListSerializer(brands, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        from apps.products.models import Brand

        validate_uploaded_image(request.FILES.get('logo'))
        serializer = AdminBrandCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        brand = Brand(**{k: v for k, v in serializer.validated_data.items()})
        brand.save()
        return Response(AdminBrandListSerializer(brand, context={'request': request}).data, status=201)


class AdminBrandDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        from apps.products.models import Brand

        validate_uploaded_image(request.FILES.get('logo'))
        brand = get_object_or_404(Brand, pk=pk)
        serializer = AdminBrandCreateUpdateSerializer(brand, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminBrandListSerializer(brand, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.products.models import Brand

        brand = get_object_or_404(Brand, pk=pk)
        if brand.products.exists():
            return Response(
                {'detail': f'Нельзя удалить: у бренда {brand.products.count()} товар(ов).'},
                status=400,
            )
        brand.delete()
        return Response(status=204)


# ═══════════════════════════════════════════════════════════
#  Specification Names CRUD
# ═══════════════════════════════════════════════════════════

class AdminSpecNameListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.products.models import SpecificationName

        qs = SpecificationName.objects.all().order_by('order', 'name')
        category_id = request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        serializer = AdminSpecificationNameSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminSpecificationNameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminSpecificationNameSerializer(serializer.instance).data, status=201)


class AdminSpecNameDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.products.models import SpecificationName

        spec = get_object_or_404(SpecificationName, pk=pk)
        serializer = AdminSpecificationNameSerializer(spec, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminSpecificationNameSerializer(spec).data)

    def delete(self, request, pk):
        from apps.products.models import SpecificationName

        spec = get_object_or_404(SpecificationName, pk=pk)
        spec.delete()
        return Response(status=204)


# ═══════════════════════════════════════════════════════════
#  Products Full CRUD
# ═══════════════════════════════════════════════════════════

class AdminProductCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = AdminProductCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(AdminProductDetailSerializer(product).data, status=201)


class AdminProductFullDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        from apps.products.models import Product

        product = get_object_or_404(
            Product.objects.select_related('category', 'brand')
            .prefetch_related('images', 'specifications__spec_name'),
            pk=pk,
        )
        return Response(AdminProductDetailSerializer(product, context={'request': request}).data)

    def patch(self, request, pk):
        from apps.products.models import Product

        product = get_object_or_404(Product, pk=pk)
        serializer = AdminProductCreateUpdateSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        product.refresh_from_db()
        return Response(AdminProductDetailSerializer(product, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.products.models import Product

        product = get_object_or_404(Product, pk=pk)
        product.delete()
        return Response(status=204)


class AdminProductImageUploadView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        from apps.products.models import Product, ProductImage

        product = get_object_or_404(Product, pk=pk)
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'detail': 'Файл изображения не передан.'}, status=400)
        validate_uploaded_image(image_file)

        img = ProductImage.objects.create(
            product=product,
            image=image_file,
            alt_text=request.data.get('alt_text', ''),
            order=int(request.data.get('order', 0)),
            is_main=request.data.get('is_main', 'false').lower() in ('true', '1'),
        )
        return Response(AdminProductImageSerializer(img, context={'request': request}).data, status=201)


class AdminProductImageDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.products.models import ProductImage

        img = get_object_or_404(ProductImage, pk=pk)
        for field in ('alt_text', 'order', 'is_main'):
            if field in request.data:
                val = request.data[field]
                if field == 'is_main':
                    val = str(val).lower() in ('true', '1')
                elif field == 'order':
                    val = int(val)
                setattr(img, field, val)
        img.save()
        return Response(AdminProductImageSerializer(img, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.products.models import ProductImage

        img = get_object_or_404(ProductImage, pk=pk)
        img.delete()
        return Response(status=204)


class AdminProductSpecsBulkView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        from apps.products.models import Product, ProductSpecification

        product = get_object_or_404(Product, pk=pk)
        specs_data = request.data.get('specs', [])

        # Delete existing specs and recreate
        ProductSpecification.objects.filter(product=product).delete()

        new_specs = []
        for item in specs_data:
            spec_name_id = item.get('spec_name')
            value = item.get('value', '').strip()
            if spec_name_id and value:
                new_specs.append(ProductSpecification(
                    product=product,
                    spec_name_id=spec_name_id,
                    value=value,
                ))
        if new_specs:
            ProductSpecification.objects.bulk_create(new_specs)

        return Response({'detail': f'Сохранено {len(new_specs)} характеристик.'})


# ═══════════════════════════════════════════════════════════
#  Presets CRUD
# ═══════════════════════════════════════════════════════════

class AdminPresetListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.configurator.models import PCConfiguration

        presets = (
            PCConfiguration.objects
            .filter(is_preset=True)
            .prefetch_related('items__product')
            .annotate(items_count=Count('items', distinct=True))
            .order_by('-created_at')
        )
        serializer = AdminPresetSerializer(presets, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        from apps.configurator.models import PCConfiguration

        validate_uploaded_image(request.FILES.get('image'))
        preset = PCConfiguration.objects.create(
            is_preset=True,
            name=request.data.get('name', ''),
            preset_label=request.data.get('preset_label', ''),
            assembly_fee=request.data.get('assembly_fee', 500),
            image=request.FILES.get('image'),
            status='completed',
        )
        return Response(AdminPresetSerializer(preset, context={'request': request}).data, status=201)


class AdminPresetDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from apps.configurator.models import PCConfiguration

        preset = get_object_or_404(
            PCConfiguration.objects.prefetch_related('items__product').annotate(
                items_count=Count('items', distinct=True),
            ),
            pk=pk, is_preset=True,
        )
        return Response(AdminPresetSerializer(preset, context={'request': request}).data)

    def patch(self, request, pk):
        from apps.configurator.models import PCConfiguration

        preset = get_object_or_404(PCConfiguration, pk=pk, is_preset=True)
        for field in ('name', 'preset_label', 'assembly_fee'):
            if field in request.data:
                setattr(preset, field, request.data[field])
        if 'image' in request.FILES:
            preset.image = request.FILES['image']
        preset.save()
        return Response(AdminPresetSerializer(preset, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.configurator.models import PCConfiguration

        preset = get_object_or_404(PCConfiguration, pk=pk, is_preset=True)
        preset.delete()
        return Response(status=204)


class AdminPresetAddItemView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        from apps.configurator.models import ConfigurationItem, PCConfiguration
        from apps.products.models import Product

        preset = get_object_or_404(PCConfiguration, pk=pk, is_preset=True)
        serializer = AdminPresetItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        product = get_object_or_404(Product, pk=data['product_id'], is_active=True)

        # Remove existing item of same component_type
        ConfigurationItem.objects.filter(
            configuration=preset, component_type=data['component_type'],
        ).delete()

        item = ConfigurationItem.objects.create(
            configuration=preset,
            product=product,
            component_type=data['component_type'],
            quantity=data.get('quantity', 1),
            price_at_addition=product.current_price,
        )
        preset.recalculate_total()
        return Response(AdminPresetItemSerializer(item, context={'request': request}).data, status=201)


class AdminPresetRemoveItemView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk, item_pk):
        from apps.configurator.models import ConfigurationItem, PCConfiguration

        preset = get_object_or_404(PCConfiguration, pk=pk, is_preset=True)
        item = get_object_or_404(ConfigurationItem, pk=item_pk, configuration=preset)
        item.delete()
        preset.recalculate_total()
        return Response(status=204)


# ═══════════════════════════════════════════════════════════
#  Hero Slides CRUD
# ═══════════════════════════════════════════════════════════

class AdminHeroSlideListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        from apps.products.models import HeroSlide

        slides = HeroSlide.objects.all().order_by('order', '-created_at')
        serializer = AdminHeroSlideSerializer(slides, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        validate_uploaded_image(request.FILES.get('image'))
        serializer = AdminHeroSlideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminHeroSlideSerializer(serializer.instance, context={'request': request}).data, status=201)


class AdminHeroSlideDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, pk):
        from apps.products.models import HeroSlide

        validate_uploaded_image(request.FILES.get('image'))
        slide = get_object_or_404(HeroSlide, pk=pk)
        serializer = AdminHeroSlideSerializer(slide, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminHeroSlideSerializer(slide, context={'request': request}).data)

    def delete(self, request, pk):
        from apps.products.models import HeroSlide

        slide = get_object_or_404(HeroSlide, pk=pk)
        slide.delete()
        return Response(status=204)
