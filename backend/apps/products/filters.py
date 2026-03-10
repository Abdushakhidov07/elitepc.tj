import django_filters

from apps.products.models import Product


class ProductFilter(django_filters.FilterSet):
    """FilterSet for Product queryset.

    Supports filtering by:
    - category (slug)
    - brand (slug)
    - price range (price_min / price_max)
    - is_featured flag
    - is_active flag
    - in_stock (stock_quantity > 0)
    """

    category = django_filters.CharFilter(
        field_name='category__slug',
        lookup_expr='exact',
        label='Категория (slug)',
    )
    brand = django_filters.CharFilter(
        field_name='brand__slug',
        lookup_expr='exact',
        label='Бренд (slug)',
    )
    price_min = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='gte',
        label='Цена от',
    )
    price_max = django_filters.NumberFilter(
        field_name='price',
        lookup_expr='lte',
        label='Цена до',
    )
    is_featured = django_filters.BooleanFilter(
        field_name='is_featured',
        label='Рекомендуемый',
    )
    is_active = django_filters.BooleanFilter(
        field_name='is_active',
        label='Активен',
    )
    in_stock = django_filters.BooleanFilter(
        method='filter_in_stock',
        label='В наличии',
    )

    class Meta:
        model = Product
        fields = [
            'category',
            'brand',
            'price_min',
            'price_max',
            'is_featured',
            'is_active',
            'in_stock',
        ]

    def filter_in_stock(self, queryset, name, value):
        if value is True:
            return queryset.filter(stock_quantity__gt=0)
        if value is False:
            return queryset.filter(stock_quantity=0)
        return queryset
