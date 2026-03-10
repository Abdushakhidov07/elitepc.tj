from django.urls import path
from apps.analytics import views

app_name = 'analytics'

urlpatterns = [
    # Dashboard & existing
    path('admin/dashboard/', views.DashboardAPIView.as_view(), name='admin-dashboard'),
    path('admin/manager-dashboard/', views.ManagerDashboardAPIView.as_view(), name='manager-dashboard'),
    path('admin/analytics/', views.AnalyticsReportView.as_view(), name='admin-analytics'),
    path('admin/orders/', views.AdminOrderListView.as_view(), name='admin-orders'),
    path('admin/orders/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('admin/products/', views.AdminProductListView.as_view(), name='admin-products'),
    path('admin/products/<int:pk>/', views.AdminProductUpdateView.as_view(), name='admin-product-update'),
    path('admin/telegram-chats/', views.TelegramChatListView.as_view(), name='admin-telegram-chats'),
    path('admin/telegram-chats/<int:pk>/', views.TelegramChatUpdateView.as_view(), name='admin-telegram-chat-update'),
    path('admin/settings/', views.AdminSettingsView.as_view(), name='admin-settings'),
    path('admin/company-settings/', views.AdminCompanySettingsView.as_view(), name='admin-company-settings'),

    # Categories CRUD
    path('admin/categories/', views.AdminCategoryListCreateView.as_view(), name='admin-categories'),
    path('admin/categories/tree/', views.AdminCategoryTreeView.as_view(), name='admin-categories-tree'),
    path('admin/categories/<int:pk>/', views.AdminCategoryDetailView.as_view(), name='admin-category-detail'),

    # Products full CRUD
    path('admin/products/create/', views.AdminProductCreateView.as_view(), name='admin-product-create'),
    path('admin/products/<int:pk>/detail/', views.AdminProductFullDetailView.as_view(), name='admin-product-detail'),
    path('admin/products/<int:pk>/images/', views.AdminProductImageUploadView.as_view(), name='admin-product-images'),
    path('admin/products/images/<int:pk>/', views.AdminProductImageDetailView.as_view(), name='admin-product-image-detail'),
    path('admin/products/<int:pk>/specs/', views.AdminProductSpecsBulkView.as_view(), name='admin-product-specs'),

    # Specification names
    path('admin/spec-names/', views.AdminSpecNameListCreateView.as_view(), name='admin-spec-names'),
    path('admin/spec-names/<int:pk>/', views.AdminSpecNameDetailView.as_view(), name='admin-spec-name-detail'),

    # Brands CRUD
    path('admin/brands/', views.AdminBrandListView.as_view(), name='admin-brands'),
    path('admin/brands/<int:pk>/', views.AdminBrandDetailView.as_view(), name='admin-brand-detail'),

    # Presets CRUD
    path('admin/presets/', views.AdminPresetListCreateView.as_view(), name='admin-presets'),
    path('admin/presets/<int:pk>/', views.AdminPresetDetailView.as_view(), name='admin-preset-detail'),
    path('admin/presets/<int:pk>/items/', views.AdminPresetAddItemView.as_view(), name='admin-preset-add-item'),
    path('admin/presets/<int:pk>/items/<int:item_pk>/', views.AdminPresetRemoveItemView.as_view(), name='admin-preset-remove-item'),

    # Hero Slides CRUD
    path('admin/hero-slides/', views.AdminHeroSlideListCreateView.as_view(), name='admin-hero-slides'),
    path('admin/hero-slides/<int:pk>/', views.AdminHeroSlideDetailView.as_view(), name='admin-hero-slide-detail'),
]
