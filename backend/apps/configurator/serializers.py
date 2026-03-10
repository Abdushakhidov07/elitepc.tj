from rest_framework import serializers

from apps.configurator.models import (
    PCConfiguration,
    ConfigurationItem,
    CompatibilityRule,
)
from apps.products.serializers import ProductListSerializer


class ConfigurationItemSerializer(serializers.ModelSerializer):
    """Serializer for a single component in a PC configuration."""

    product_detail = ProductListSerializer(source='product', read_only=True)

    class Meta:
        model = ConfigurationItem
        fields = [
            'id',
            'component_type',
            'product',
            'product_detail',
            'quantity',
            'price_at_addition',
        ]
        read_only_fields = ['id', 'price_at_addition']


class PCConfigurationSerializer(serializers.ModelSerializer):
    """Full serializer for a PC configuration with all items."""

    items = ConfigurationItemSerializer(many=True, read_only=True)
    total_with_assembly = serializers.SerializerMethodField()
    image = serializers.ImageField(read_only=True, use_url=True, required=False)

    class Meta:
        model = PCConfiguration
        fields = [
            'id',
            'name',
            'status',
            'items',
            'total_price',
            'assembly_fee',
            'total_with_assembly',
            'ai_rating',
            'ai_comment',
            'is_preset',
            'preset_label',
            'image',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'total_price',
            'ai_rating',
            'ai_comment',
            'created_at',
            'updated_at',
        ]

    def get_total_with_assembly(self, obj):
        return str(obj.total_price + obj.assembly_fee)


class PCConfigurationCreateSerializer(serializers.Serializer):
    """Serializer for creating a new (empty) PC configuration."""

    name = serializers.CharField(max_length=200, required=False, default='', allow_blank=True)


class AddComponentSerializer(serializers.Serializer):
    """Serializer for adding a component to a configuration."""

    product_id = serializers.IntegerField()
    component_type = serializers.ChoiceField(
        choices=ConfigurationItem.COMPONENT_CHOICES,
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class CompatibilityResultSerializer(serializers.Serializer):
    """Serializer for the result of a compatibility check."""

    is_compatible = serializers.BooleanField()
    warnings = serializers.ListField(child=serializers.CharField())
    errors = serializers.ListField(child=serializers.CharField())


class AIEvaluationSerializer(serializers.Serializer):
    """Serializer for the AI evaluation response."""

    rating = serializers.IntegerField(min_value=1, max_value=10)
    comment = serializers.CharField()
    balance_score = serializers.IntegerField(
        min_value=1, max_value=10, required=False, default=None, allow_null=True,
    )
    recommendations = serializers.ListField(
        child=serializers.CharField(), required=False, default=list,
    )
    suitable_for = serializers.ListField(
        child=serializers.CharField(), required=False, default=list,
    )
    estimated_fps = serializers.DictField(
        child=serializers.CharField(), required=False, default=dict,
    )


class AddToCartSerializer(serializers.Serializer):
    """Serializer for adding a configuration to the cart."""

    with_assembly = serializers.BooleanField(default=False)
