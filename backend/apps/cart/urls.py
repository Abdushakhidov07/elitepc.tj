from django.urls import path
from . import views

app_name = 'cart'

urlpatterns = [
    path('cart/', views.CartView.as_view(), name='cart'),
    path('cart/add/', views.CartAddView.as_view(), name='cart-add'),
    path('cart/<int:item_id>/', views.CartItemView.as_view(), name='cart-item'),
    path('cart/clear/', views.CartClearView.as_view(), name='cart-clear'),
]
