from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.products.models import (
    Category,
    Brand,
    Product,
    SpecificationName,
    ProductSpecification,
    HeroSlide,
    SiteSettings,
)
from apps.products.serializers import (
    CategoryTreeSerializer,
    BrandSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    SpecificationNameSerializer,
    HeroSlideSerializer,
    SiteSettingsSerializer,
)
from apps.products.filters import ProductFilter


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

class ProductListView(generics.ListAPIView):
    """
    GET /api/v1/products/

    List products with filtering, search, ordering, and pagination.
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description', 'short_description', 'sku']
    ordering_fields = ['price', 'created_at', 'views_count', 'discount_percent']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category', 'brand')
        )


class ProductDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/products/{slug}/

    Retrieve a single product by slug. Increments views_count atomically.
    """

    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category', 'brand')
            .prefetch_related('images', 'specifications__spec_name')
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Atomic increment to avoid race conditions
        Product.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class SimilarProductsView(generics.ListAPIView):
    """
    GET /api/v1/products/{slug}/similar/

    Return up to 10 products from the same category, excluding the current one.
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        product = get_object_or_404(Product, slug=self.kwargs['slug'], is_active=True)
        return (
            Product.objects
            .filter(category=product.category, is_active=True)
            .exclude(pk=product.pk)
            .select_related('category', 'brand')
            [:10]
        )


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryListView(generics.ListAPIView):
    """
    GET /api/v1/categories/

    Return the full category tree (only active root nodes; children nested).
    """

    serializer_class = CategoryTreeSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Return full tree, no pagination

    def get_queryset(self):
        return Category.objects.filter(is_active=True, parent__isnull=True)


class CategoryProductsView(generics.ListAPIView):
    """
    GET /api/v1/categories/{slug}/products/

    Return products belonging to a category (including descendants).
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description', 'short_description', 'sku']
    ordering_fields = ['price', 'created_at', 'views_count', 'discount_percent']
    ordering = ['-created_at']

    def get_queryset(self):
        category = get_object_or_404(Category, slug=self.kwargs['slug'], is_active=True)
        # Include the category itself and all its descendants (MPTT)
        descendant_ids = category.get_descendants(include_self=True).values_list('id', flat=True)
        qs = (
            Product.objects
            .filter(category_id__in=descendant_ids, is_active=True)
            .select_related('category', 'brand')
        )

        # Apply spec-based filters: spec_<id>=value1,value2
        for key in self.request.query_params:
            if key.startswith('spec_'):
                value = self.request.query_params[key]
                if not value:
                    continue
                try:
                    spec_id = int(key[5:])
                    values = [v.strip() for v in value.split(',') if v.strip()]
                    if values:
                        qs = qs.filter(
                            specifications__spec_name_id=spec_id,
                            specifications__value__in=values,
                        ).distinct()
                except (ValueError, TypeError):
                    pass

        return qs


class CategoryFiltersView(APIView):
    """
    GET /api/v1/categories/{slug}/filters/

    Return filterable SpecificationNames for this category together with
    the distinct values currently present in products.  This powers the
    dynamic sidebar filters on the frontend.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        category = get_object_or_404(Category, slug=slug, is_active=True)

        spec_names = (
            SpecificationName.objects
            .filter(category=category, is_filterable=True)
            .order_by('order')
        )

        filters_data = []
        for spec in spec_names:
            # Collect distinct values that exist for active products in this category
            values = (
                ProductSpecification.objects
                .filter(
                    spec_name=spec,
                    product__category=category,
                    product__is_active=True,
                )
                .values_list('value', flat=True)
                .distinct()
                .order_by('value')
            )

            filters_data.append({
                'id': spec.id,
                'name': spec.name,
                'unit': spec.unit,
                'filter_type': spec.filter_type,
                'values': list(values),
            })

        return Response(filters_data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Brands
# ---------------------------------------------------------------------------

class BrandListView(generics.ListAPIView):
    """
    GET /api/v1/brands/

    Return all brands.
    """

    serializer_class = BrandSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Brands list is typically small

    def get_queryset(self):
        return Brand.objects.all()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class ProductSearchView(generics.ListAPIView):
    """
    GET /api/v1/search/?q=

    Full-text search across product name, description, and SKU.
    """

    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if not query:
            return Product.objects.none()

        return (
            Product.objects
            .filter(
                is_active=True,
            )
            .filter(
                Q(name__icontains=query)
                | Q(description__icontains=query)
                | Q(short_description__icontains=query)
                | Q(sku__icontains=query)
            )
            .select_related('category', 'brand')
            .order_by('-views_count', '-created_at')
        )


class HeroSlideListView(generics.ListAPIView):
    """GET /api/v1/hero-slides/ -- active hero slides for the homepage."""
    permission_classes = [AllowAny]
    serializer_class = HeroSlideSerializer
    pagination_class = None

    def get_queryset(self):
        return HeroSlide.objects.filter(is_active=True)


class SiteSettingsView(APIView):
    """GET /api/v1/site-settings/ -- public company settings (contacts, address, etc.)."""
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings_obj)
        return Response(serializer.data)
