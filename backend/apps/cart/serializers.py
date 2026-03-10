from rest_framework import serializers

from apps.cart.models import CartItem
from apps.products.models import Product


class CartProductSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'sku', 'main_image', 'price',
                  'discount_price', 'current_price', 'stock_quantity']


class CartConfigurationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    assembly_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()


class CartItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)
    configuration = CartConfigurationSerializer(read_only=True)
    item_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'configuration', 'quantity',
                  'with_assembly', 'item_total', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    configuration_id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1, default=1)
    with_assembly = serializers.BooleanField(default=False)

    def validate(self, data):
        product_id = data.get('product_id')
        configuration_id = data.get('configuration_id')

        if not product_id and not configuration_id:
            raise serializers.ValidationError(
                'Укажите product_id или configuration_id.'
            )
        if product_id and configuration_id:
            raise serializers.ValidationError(
                'Укажите только product_id или configuration_id, не оба.'
            )

        if product_id:
            from apps.products.models import Product
            try:
                product = Product.objects.get(pk=product_id, is_active=True)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    {'product_id': 'Товар не найден или не активен.'}
                )
            if product.stock_quantity < data.get('quantity', 1):
                raise serializers.ValidationError(
                    {'product_id': 'Недостаточно товара на складе.'}
                )

        if configuration_id:
            from apps.configurator.models import PCConfiguration
            try:
                PCConfiguration.objects.get(pk=configuration_id)
            except PCConfiguration.DoesNotExist:
                raise serializers.ValidationError(
                    {'configuration_id': 'Конфигурация не найдена.'}
                )

        return data


class CartUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        cart_item = self.context.get('cart_item')
        if cart_item and cart_item.product:
            if value > cart_item.product.stock_quantity:
                raise serializers.ValidationError(
                    'Недостаточно товара на складе.'
                )
        return value
