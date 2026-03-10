from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    path('products/', views.ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('products/<slug:slug>/similar/', views.SimilarProductsView.as_view(), name='product-similar'),
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/<slug:slug>/products/', views.CategoryProductsView.as_view(), name='category-products'),
    path('categories/<slug:slug>/filters/', views.CategoryFiltersView.as_view(), name='category-filters'),
    path('brands/', views.BrandListView.as_view(), name='brand-list'),
    path('search/', views.ProductSearchView.as_view(), name='product-search'),
    path('hero-slides/', views.HeroSlideListView.as_view(), name='hero-slides'),
    path('site-settings/', views.SiteSettingsView.as_view(), name='site-settings'),
]
