from rest_framework import serializers
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.products.models import (
    Brand, Category, Product, ProductImage, ProductSpecification, SpecificationName,
)
from apps.configurator.models import ConfigurationItem, PCConfiguration
from apps.notifications.models import NotificationSettings, TelegramChat
from apps.products.models import HeroSlide, SiteSettings
from apps.products.serializers import SITE_SETTINGS_FIELDS


class AdminOrderListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'customer_name', 'customer_phone', 'customer_email',
            'delivery_method', 'total_price', 'is_guest_order',
            'created_at', 'items_count',
        ]


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_slug = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    configuration_name = serializers.SerializerMethodField()
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_slug', 'product_image', 'product_sku',
            'configuration', 'configuration_name',
            'quantity', 'price_at_purchase', 'is_assembled', 'assembly_fee', 'line_total',
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None

    def get_product_slug(self, obj):
        return obj.product.slug if obj.product else None

    def get_product_image(self, obj):
        if obj.product and obj.product.main_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.product.main_image.url)
            return obj.product.main_image.url
        return None

    def get_product_sku(self, obj):
        return obj.product.sku if obj.product else None

    def get_configuration_name(self, obj):
        return str(obj.configuration) if obj.configuration else None


class AdminOrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'old_status', 'new_status', 'changed_by_name', 'comment', 'created_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return 'Система'


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    status_history = AdminOrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    delivery_method_display = serializers.CharField(source='get_delivery_method_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'customer_name', 'customer_phone', 'customer_email',
            'customer_city', 'customer_address',
            'delivery_method', 'delivery_method_display',
            'comment', 'total_price', 'discount_amount',
            'is_guest_order', 'created_at', 'updated_at',
            'items', 'status_history',
        ]


class AdminProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    brand_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category_name', 'brand_name',
            'price', 'discount_price', 'stock_quantity', 'is_active',
            'is_featured', 'main_image', 'created_at',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None


class AdminProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['price', 'discount_price', 'stock_quantity', 'is_active', 'is_featured']


class TelegramChatSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TelegramChat
        fields = [
            'id', 'chat_id', 'chat_type', 'title', 'username',
            'status', 'status_display', 'registered_at', 'updated_at',
        ]
        read_only_fields = ['id', 'chat_id', 'chat_type', 'title', 'username', 'registered_at', 'updated_at']


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'telegram_bot_token', 'telegram_channel_id', 'is_active',
            'notify_on_new_order', 'notify_on_status_change',
            'notify_on_low_stock', 'low_stock_threshold', 'daily_report_time',
        ]


class SiteSettingsAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = SITE_SETTINGS_FIELDS


# ── Categories ──────────────────────────────────────────────

class AdminCategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField(read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    products_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'image',
            'parent', 'parent_name', 'is_active', 'order',
            'meta_title', 'meta_description', 'children_count', 'products_count',
        ]
        read_only_fields = ['id', 'slug']

    def get_children_count(self, obj):
        return obj.get_children().count()

    def get_products_count(self, obj):
        return obj.products.count()


class AdminCategoryTreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'level']


# ── Brands ──────────────────────────────────────────────────

class AdminBrandListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description']


class AdminBrandCreateUpdateSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Brand
        fields = ['id', 'name', 'slug', 'logo', 'description']
        read_only_fields = ['slug']


# ── Specification Names ─────────────────────────────────────

class AdminSpecificationNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecificationName
        fields = [
            'id', 'name', 'category', 'unit', 'filter_type',
            'is_filterable', 'is_comparable', 'order',
        ]
        read_only_fields = ['id']


# ── Products CRUD ───────────────────────────────────────────

class AdminProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'short_description',
            'category', 'brand', 'price', 'discount_price',
            'stock_quantity', 'is_active', 'is_featured', 'main_image',
        ]
        read_only_fields = ['id']


class AdminProductSpecSerializer(serializers.ModelSerializer):
    spec_name_display = serializers.CharField(source='spec_name.name', read_only=True)
    unit = serializers.CharField(source='spec_name.unit', read_only=True)

    class Meta:
        model = ProductSpecification
        fields = ['id', 'spec_name', 'spec_name_display', 'unit', 'value']


class AdminProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'alt_text', 'order', 'is_main']
        read_only_fields = ['id']


class AdminProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, default='')
    brand_name = serializers.SerializerMethodField()
    images = AdminProductImageSerializer(many=True, read_only=True)
    specifications = AdminProductSpecSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'description', 'short_description',
            'category', 'category_name', 'brand', 'brand_name',
            'price', 'discount_price', 'discount_percent',
            'stock_quantity', 'is_active', 'is_featured', 'main_image',
            'images', 'specifications', 'created_at',
        ]

    def get_brand_name(self, obj):
        return obj.brand.name if obj.brand else None


# ── Presets ──────────────────────────────────────────────────

class AdminPresetItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.main_image', read_only=True)
    product_price = serializers.DecimalField(
        source='product.current_price', max_digits=10, decimal_places=2, read_only=True,
    )

    class Meta:
        model = ConfigurationItem
        fields = [
            'id', 'component_type', 'product', 'product_name',
            'product_image', 'product_price', 'quantity', 'price_at_addition',
        ]


class AdminPresetSerializer(serializers.ModelSerializer):
    items = AdminPresetItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = PCConfiguration
        fields = [
            'id', 'name', 'preset_label', 'assembly_fee', 'total_price',
            'status', 'image', 'items', 'items_count', 'created_at',
        ]
        read_only_fields = ['id', 'total_price', 'created_at']

    def get_items_count(self, obj):
        return obj.items.count()


class AdminPresetItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    component_type = serializers.ChoiceField(choices=ConfigurationItem.COMPONENT_CHOICES)
    quantity = serializers.IntegerField(min_value=1, default=1)


# ── Hero Slides ────────────────────────────────────────────

class AdminHeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = [
            'id', 'title', 'subtitle', 'description', 'image',
            'button_text', 'button_link', 'order', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
