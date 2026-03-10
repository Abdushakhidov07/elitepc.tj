from rest_framework import serializers

from apps.products.models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductSpecification,
    SpecificationName,
    HeroSlide,
    SiteSettings,
)


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for a single category (flat, no children)."""

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'image',
            'parent',
            'is_active',
            'order',
            'meta_title',
            'meta_description',
        ]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Recursive serializer for category tree (MPTT)."""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'image',
            'is_active',
            'order',
            'meta_title',
            'meta_description',
            'children',
        ]

    def get_children(self, obj):
        children = obj.get_children().filter(is_active=True)
        return CategoryTreeSerializer(children, many=True, context=self.context).data


class BrandSerializer(serializers.ModelSerializer):

    class Meta:
        model = Brand
        fields = [
            'id',
            'name',
            'slug',
            'logo',
            'description',
        ]


class ProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage
        fields = [
            'id',
            'image',
            'alt_text',
            'order',
            'is_main',
        ]


class SpecificationNameSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = SpecificationName
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'unit',
            'filter_type',
            'is_filterable',
            'is_comparable',
            'order',
        ]


class ProductSpecificationSerializer(serializers.ModelSerializer):
    """Specification with its name and unit resolved."""

    spec_name_display = serializers.CharField(source='spec_name.name', read_only=True)
    unit = serializers.CharField(source='spec_name.unit', read_only=True)

    class Meta:
        model = ProductSpecification
        fields = [
            'id',
            'spec_name',
            'spec_name_display',
            'unit',
            'value',
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    brand_name = serializers.SerializerMethodField()
    brand_slug = serializers.SerializerMethodField()
    current_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True,
    )
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'sku',
            'short_description',
            'category',
            'category_name',
            'category_slug',
            'brand',
            'brand_name',
            'brand_slug',
            'price',
            'discount_price',
            'discount_percent',
            'current_price',
            'in_stock',
            'main_image',
            'is_featured',
            'views_count',
            'created_at',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_brand_slug(self, obj):
        return obj.brand.slug if obj.brand else None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail page."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    brand_name = serializers.SerializerMethodField()
    brand_slug = serializers.SerializerMethodField()
    current_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True,
    )
    in_stock = serializers.BooleanField(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    specifications = ProductSpecificationSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'sku',
            'description',
            'short_description',
            'category',
            'category_name',
            'category_slug',
            'brand',
            'brand_name',
            'brand_slug',
            'price',
            'discount_price',
            'discount_percent',
            'current_price',
            'stock_quantity',
            'in_stock',
            'is_active',
            'is_featured',
            'main_image',
            'views_count',
            'created_at',
            'updated_at',
            'images',
            'specifications',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None

    def get_brand_slug(self, obj):
        return obj.brand.slug if obj.brand else None


class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ['id', 'title', 'subtitle', 'description', 'image',
                  'button_text', 'button_link']


SITE_SETTINGS_FIELDS = [
    'phone_primary', 'phone_secondary',
    'email_primary', 'email_support',
    'telegram_handle', 'telegram_url',
    'address_line1', 'address_line2', 'address_line3',
    'working_hours',
    'about_text', 'about_mission',
    'delivery_city_price', 'delivery_free_threshold',
    'delivery_city_days', 'delivery_country_days',
    'site_name', 'meta_description',
]


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = SITE_SETTINGS_FIELDS
