from django.contrib import admin
from django.utils.html import format_html

from apps.orders.models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['line_total_display']
    raw_id_fields = ['product', 'configuration']
    fields = [
        'product', 'configuration', 'quantity',
        'price_at_purchase', 'is_assembled', 'assembly_fee',
        'line_total_display',
    ]

    @admin.display(description='Сумма позиции')
    def line_total_display(self, obj):
        if obj.pk:
            return f'{obj.line_total} сом.'
        return '-'


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ['old_status', 'new_status', 'changed_by', 'comment', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'customer_name', 'customer_phone',
        'colored_status', 'total_price_display',
        'delivery_method', 'is_guest_order', 'created_at',
    ]
    list_filter = ['status', 'delivery_method', 'is_guest_order', 'created_at']
    search_fields = ['order_number', 'customer_name', 'customer_phone', 'customer_email']
    readonly_fields = ['order_number', 'total_price', 'created_at', 'updated_at']
    inlines = [OrderItemInline, OrderStatusHistoryInline]
    list_per_page = 25

    fieldsets = (
        ('Заказ', {
            'fields': ('order_number', 'user', 'status', 'is_guest_order'),
        }),
        ('Клиент', {
            'fields': (
                'customer_name', 'customer_phone', 'customer_email',
                'customer_city', 'customer_address',
            ),
        }),
        ('Доставка и оплата', {
            'fields': ('delivery_method', 'comment'),
        }),
        ('Суммы', {
            'fields': ('total_price', 'discount_amount'),
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
        }),
    )

    STATUS_COLORS = {
        'new': '#3498db',         # синий
        'confirmed': '#2ecc71',   # зелёный
        'paid': '#27ae60',        # тёмно-зелёный
        'assembling': '#f39c12',  # оранжевый
        'shipping': '#e67e22',    # тёмно-оранжевый
        'completed': '#1abc9c',   # бирюзовый
        'cancelled': '#e74c3c',   # красный
    }

    @admin.display(description='Статус', ordering='status')
    def colored_status(self, obj):
        color = self.STATUS_COLORS.get(obj.status, '#95a5a6')
        return format_html(
            '<span style="color: white; background-color: {}; '
            'padding: 3px 10px; border-radius: 3px; font-size: 11px;">'
            '{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description='Итого')
    def total_price_display(self, obj):
        return f'{obj.total_price} сом.'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'product', 'configuration',
        'quantity', 'price_at_purchase', 'is_assembled',
        'assembly_fee',
    ]
    list_filter = ['is_assembled']
    list_select_related = ['order', 'product', 'configuration']
    raw_id_fields = ['order', 'product', 'configuration']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'old_status', 'new_status',
        'changed_by', 'created_at',
    ]
    list_filter = ['new_status', 'created_at']
    list_select_related = ['order', 'changed_by']
    readonly_fields = ['order', 'old_status', 'new_status', 'changed_by', 'comment', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
