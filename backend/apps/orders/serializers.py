from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.products.models import Product


class OrderItemProductSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'sku', 'main_image', 'current_price']


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = OrderItemProductSerializer(source='product', read_only=True)
    line_total = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_detail', 'configuration',
            'quantity', 'price_at_purchase', 'is_assembled',
            'assembly_fee', 'line_total',
        ]
        read_only_fields = ['id']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'old_status', 'new_status', 'changed_by',
            'changed_by_name', 'comment', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return None


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=200)
    customer_phone = serializers.CharField(max_length=20)
    customer_email = serializers.EmailField(required=False, allow_blank=True, default='')
    customer_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    customer_address = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_method = serializers.ChoiceField(
        choices=Order.DELIVERY_CHOICES, default='pickup'
    )
    comment = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_customer_phone(self, value):
        cleaned = value.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        if len(cleaned) < 10:
            raise serializers.ValidationError(
                'Номер телефона слишком короткий.'
            )
        return value

    def validate(self, data):
        request = self.context.get('request')
        request_items = request.data.get('items', []) if request else []

        if request and request.user.is_authenticated:
            from apps.cart.models import CartItem
            cart_items = CartItem.objects.filter(user=request.user)
            # Accept if server cart has items OR request body has items
            if not cart_items.exists() and not request_items:
                raise serializers.ValidationError(
                    'Корзина пуста. Добавьте товары перед оформлением заказа.'
                )
        else:
            if not request_items:
                raise serializers.ValidationError(
                    'Корзина пуста. Добавьте товары перед оформлением заказа.'
                )

        return data


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_display',
            'total_price', 'created_at', 'items_count',
        ]

    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    delivery_method_display = serializers.CharField(
        source='get_delivery_method_display', read_only=True
    )

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


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    comment = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        order = self.context.get('order')
        if not order:
            return value

        if value == order.status:
            raise serializers.ValidationError(
                'Заказ уже имеет этот статус.'
            )

        return value
