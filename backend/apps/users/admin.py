from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from apps.users.models import User, UserProfile, Wishlist


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name = 'Профиль'
    verbose_name_plural = 'Профиль'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]

    list_display = [
        'username', 'email', 'first_name', 'last_name',
        'phone', 'city', 'is_verified', 'is_staff', 'is_active',
    ]
    list_filter = ['is_verified', 'is_staff', 'is_active', 'city']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Дополнительно', {
            'fields': ('phone', 'city', 'address', 'telegram_id', 'is_verified'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Дополнительно', {
            'fields': ('email', 'phone', 'city', 'address', 'telegram_id', 'is_verified'),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'avatar']
    search_fields = ['user__username', 'user__email']
    raw_id_fields = ['user']


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email', 'product__name']
    raw_id_fields = ['user', 'product']
