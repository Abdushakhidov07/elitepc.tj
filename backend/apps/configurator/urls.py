from django.urls import path
from . import views

app_name = 'configurator'

urlpatterns = [
    path('configurator/', views.ConfigurationCreateView.as_view(), name='config-create'),
    path('configurator/presets/', views.PresetsListView.as_view(), name='config-presets'),
    path('configurator/debug/categories/', views.DebugCategoriesView.as_view(), name='config-debug-categories'),
    path('configurator/<int:pk>/', views.ConfigurationDetailView.as_view(), name='config-detail'),
    path('configurator/<int:pk>/add-component/', views.AddComponentView.as_view(), name='config-add-component'),
    path('configurator/<int:pk>/remove-component/<str:component_type>/', views.RemoveComponentView.as_view(), name='config-remove-component'),
    path('configurator/<int:pk>/compatible-products/<str:component_type>/', views.CompatibleProductsView.as_view(), name='config-compatible'),
    path('configurator/<int:pk>/check-compatibility/', views.CheckCompatibilityView.as_view(), name='config-check'),
    path('configurator/<int:pk>/ai-evaluate/', views.AIEvaluateView.as_view(), name='config-ai-evaluate'),
    path('configurator/<int:pk>/add-to-cart/', views.AddToCartView.as_view(), name='config-add-to-cart'),
]
