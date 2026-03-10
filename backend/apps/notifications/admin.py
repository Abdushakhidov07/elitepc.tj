from django.contrib import admin
from apps.notifications.models import NotificationSettings


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'is_active', 'notify_on_new_order', 'notify_on_status_change', 'notify_on_low_stock')

    def has_add_permission(self, request):
        return not NotificationSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
