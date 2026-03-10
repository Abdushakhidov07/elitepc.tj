from django.contrib import admin
from mptt.admin import MPTTModelAdmin

from apps.products.models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductSpecification,
    SpecificationName,
    HeroSlide,
)


# ---------------------------------------------------------------------------
# Inlines
# ---------------------------------------------------------------------------

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'alt_text', 'order', 'is_main')
    ordering = ('order',)


class ProductSpecificationInline(admin.TabularInline):
    model = ProductSpecification
    extra = 1
    fields = ('spec_name', 'value')
    autocomplete_fields = ('spec_name',)


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

@admin.register(Category)
class CategoryAdmin(MPTTModelAdmin):
    list_display = ('name', 'slug', 'parent', 'is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('is_active', 'order')
    mptt_level_indent = 20


# ---------------------------------------------------------------------------
# Brand
# ---------------------------------------------------------------------------

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'sku',
        'category',
        'brand',
        'price',
        'discount_price',
        'discount_percent',
        'stock_quantity',
        'is_active',
        'is_featured',
        'views_count',
        'created_at',
    )
    list_filter = (
        'is_active',
        'is_featured',
        'category',
        'brand',
    )
    search_fields = ('name', 'slug', 'sku', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('price', 'discount_price', 'stock_quantity', 'is_active', 'is_featured')
    readonly_fields = ('views_count', 'created_at', 'updated_at')
    autocomplete_fields = ('category', 'brand')
    inlines = [ProductImageInline, ProductSpecificationInline]

    fieldsets = (
        ('Основные', {
            'fields': (
                'name', 'slug', 'sku', 'short_description', 'description',
                'category', 'brand',
            ),
        }),
        ('Цена и наличие', {
            'fields': (
                'price', 'discount_price', 'discount_percent',
                'stock_quantity',
            ),
        }),
        ('Медиа', {
            'fields': ('main_image',),
        }),
        ('Статус', {
            'fields': ('is_active', 'is_featured'),
        }),
        ('Статистика', {
            'classes': ('collapse',),
            'fields': ('views_count', 'created_at', 'updated_at'),
        }),
    )

    actions = ['activate_products', 'deactivate_products']

    @admin.action(description='Активировать выбранные товары')
    def activate_products(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} товар(ов) активировано.')

    @admin.action(description='Деактивировать выбранные товары')
    def deactivate_products(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} товар(ов) деактивировано.')


# ---------------------------------------------------------------------------
# SpecificationName
# ---------------------------------------------------------------------------

@admin.register(SpecificationName)
class SpecificationNameAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit', 'filter_type', 'is_filterable', 'is_comparable', 'order')
    list_filter = ('category', 'filter_type', 'is_filterable', 'is_comparable')
    search_fields = ('name',)
    list_editable = ('order', 'is_filterable', 'is_comparable')
    autocomplete_fields = ('category',)


# ---------------------------------------------------------------------------
# HeroSlide
# ---------------------------------------------------------------------------

@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ('title', 'subtitle', 'order', 'is_active', 'created_at')
    list_editable = ('order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'subtitle')
