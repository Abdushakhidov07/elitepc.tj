from django.urls import path
from apps.notifications.webhook import TelegramWebhookView

app_name = 'notifications'

urlpatterns = [
    path('telegram/webhook/<str:token_hash>/', TelegramWebhookView.as_view(), name='telegram-webhook'),
]
