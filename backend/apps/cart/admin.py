from django.contrib import admin

from apps.cart.models import CartItem


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'product', 'configuration',
        'quantity', 'with_assembly', 'item_total_display',
        'created_at', 'updated_at',
    ]
    list_filter = ['with_assembly', 'created_at']
    list_select_related = ['user', 'product', 'configuration']
    raw_id_fields = ['user', 'product', 'configuration']
    readonly_fields = ['created_at', 'updated_at']

    @admin.display(description='Сумма')
    def item_total_display(self, obj):
        return f'{obj.item_total} сом.'
