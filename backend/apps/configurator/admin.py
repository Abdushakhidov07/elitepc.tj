from django.contrib import admin

from apps.configurator.models import (
    CompatibilityRule,
    ConfigurationItem,
    PCConfiguration,
)


class ConfigurationItemInline(admin.TabularInline):
    model = ConfigurationItem
    extra = 0
    readonly_fields = ('price_at_addition',)
    autocomplete_fields = ('product',)


@admin.register(PCConfiguration)
class PCConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'user',
        'status',
        'total_price',
        'ai_rating',
        'is_preset',
        'preset_label',
        'created_at',
    )
    list_filter = ('status', 'is_preset', 'created_at')
    search_fields = ('name', 'user__email', 'user__username', 'preset_label')
    readonly_fields = ('total_price', 'ai_rating', 'ai_comment', 'created_at', 'updated_at')
    list_editable = ('is_preset', 'preset_label')
    inlines = [ConfigurationItemInline]
    ordering = ('-created_at',)

    fieldsets = (
        (None, {
            'fields': ('name', 'user', 'session_key', 'status'),
        }),
        ('Цены', {
            'fields': ('total_price', 'assembly_fee'),
        }),
        ('AI-оценка', {
            'fields': ('ai_rating', 'ai_comment'),
            'classes': ('collapse',),
        }),
        ('Пресет', {
            'fields': ('is_preset', 'preset_label', 'image'),
        }),
        ('Даты', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(CompatibilityRule)
class CompatibilityRuleAdmin(admin.ModelAdmin):
    list_display = ('rule_type', 'is_hard', 'message_template')
    list_filter = ('is_hard',)
    list_editable = ('is_hard',)
    search_fields = ('rule_type', 'message_template')
