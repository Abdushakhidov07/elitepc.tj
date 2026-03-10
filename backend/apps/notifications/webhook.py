import hashlib
import logging

import requests as http_requests
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import NotificationSettings, TelegramChat

logger = logging.getLogger(__name__)


class TelegramWebhookView(APIView):
    """
    POST /api/v1/telegram/webhook/<token_hash>/

    Receives updates from Telegram Bot API.
    The URL includes a hash of the bot token to prevent unauthorized access.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request, token_hash=None):
        ns = NotificationSettings.get_settings()
        bot_token = ns.telegram_bot_token or getattr(settings, 'TELEGRAM_BOT_TOKEN', '')

        if not bot_token:
            return Response({'ok': False}, status=403)

        expected_hash = hashlib.sha256(bot_token.encode()).hexdigest()[:16]
        if token_hash != expected_hash:
            return Response({'ok': False}, status=403)

        data = request.data
        message = data.get('message') or data.get('channel_post') or {}

        if not message:
            return Response({'ok': True})

        text = message.get('text', '')
        chat = message.get('chat', {})
        chat_id = chat.get('id')

        if not chat_id:
            return Response({'ok': True})

        if text.strip() == '/start':
            obj, created = TelegramChat.objects.update_or_create(
                chat_id=chat_id,
                defaults={
                    'chat_type': chat.get('type', ''),
                    'title': chat.get('title', '') or chat.get('first_name', ''),
                    'username': chat.get('username', ''),
                },
            )
            # Don't overwrite status if chat already exists and was approved/rejected
            if created:
                reply = (
                    "Elite PC Bot\n\n"
                    "Чат зарегистрирован.\n"
                    "Ожидайте одобрения администратора для получения уведомлений о заказах."
                )
            else:
                status_text = obj.get_status_display()
                reply = f"Elite PC Bot\n\nЭтот чат уже зарегистрирован.\nСтатус: {status_text}"

            self._reply(bot_token, chat_id, reply)

        return Response({'ok': True})

    def _reply(self, token, chat_id, text):
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            http_requests.post(url, json={'chat_id': chat_id, 'text': text}, timeout=5)
        except Exception as e:
            logger.warning("Failed to reply to Telegram chat %s: %s", chat_id, e)
