import hashlib
import logging
import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.notifications.models import NotificationSettings, TelegramChat

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run Telegram bot in long-polling mode (for local development)'

    def handle(self, *args, **options):
        ns = NotificationSettings.get_settings()
        token = ns.telegram_bot_token or getattr(settings, 'TELEGRAM_BOT_TOKEN', '')

        if not token:
            self.stderr.write(self.style.ERROR(
                'TELEGRAM_BOT_TOKEN не настроен. '
                'Задайте его в .env или в админке (Настройки).'
            ))
            return

        # Delete any existing webhook so polling works
        self.stdout.write('Удаляю webhook (если был)...')
        requests.post(
            f'https://api.telegram.org/bot{token}/deleteWebhook',
            timeout=10,
        )

        # Save token to DB settings if not there
        if not ns.telegram_bot_token:
            ns.telegram_bot_token = token
            ns.save()
            self.stdout.write('Токен сохранён в настройки БД.')

        bot_info = requests.get(
            f'https://api.telegram.org/bot{token}/getMe',
            timeout=10,
        ).json()

        if bot_info.get('ok'):
            bot_name = bot_info['result'].get('first_name', '')
            bot_username = bot_info['result'].get('username', '')
            self.stdout.write(self.style.SUCCESS(
                f'Бот запущен: {bot_name} (@{bot_username})'
            ))
            self.stdout.write(f'Добавьте бота в группу и отправьте /start')
            self.stdout.write(f'Для остановки нажмите Ctrl+C\n')
        else:
            self.stderr.write(self.style.ERROR(f'Ошибка подключения: {bot_info}'))
            return

        offset = 0

        try:
            while True:
                try:
                    resp = requests.get(
                        f'https://api.telegram.org/bot{token}/getUpdates',
                        params={'offset': offset, 'timeout': 30},
                        timeout=35,
                    )
                    data = resp.json()

                    if not data.get('ok'):
                        self.stderr.write(f'Ошибка API: {data}')
                        time.sleep(5)
                        continue

                    for update in data.get('result', []):
                        offset = update['update_id'] + 1
                        self._process_update(update, token)

                except requests.exceptions.Timeout:
                    continue
                except requests.exceptions.ConnectionError:
                    self.stderr.write('Нет соединения, повтор через 5 сек...')
                    time.sleep(5)
                except Exception as e:
                    self.stderr.write(f'Ошибка: {e}')
                    time.sleep(3)

        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nБот остановлен.'))

    def _process_update(self, update, token):
        message = update.get('message') or update.get('channel_post')
        if not message:
            return

        chat = message.get('chat', {})
        chat_id = chat.get('id')
        text = message.get('text', '')

        if not chat_id:
            return

        chat_title = chat.get('title', '') or chat.get('first_name', '')
        chat_type = chat.get('type', '')

        self.stdout.write(
            f'  [{chat_type}] {chat_title} (ID: {chat_id}): {text[:50]}'
        )

        if text.strip() == '/start':
            obj, created = TelegramChat.objects.update_or_create(
                chat_id=chat_id,
                defaults={
                    'chat_type': chat_type,
                    'title': chat_title,
                    'username': chat.get('username', ''),
                },
            )

            if created:
                reply = (
                    "✅ Elite PC Bot\n\n"
                    "Чат зарегистрирован!\n"
                    "Ожидайте одобрения администратора для получения уведомлений о заказах."
                )
                self.stdout.write(self.style.SUCCESS(
                    f'  → Новый чат зарегистрирован: {chat_title} ({chat_id})'
                ))
            else:
                status_text = obj.get_status_display()
                reply = f"ℹ️ Elite PC Bot\n\nЭтот чат уже зарегистрирован.\nСтатус: {status_text}"
                self.stdout.write(f'  → Чат уже существует: {status_text}')

            self._send_message(token, chat_id, reply)

        elif text.strip() == '/status':
            try:
                obj = TelegramChat.objects.get(chat_id=chat_id)
                reply = (
                    f"ℹ️ Статус чата: {obj.get_status_display()}\n"
                    f"Зарегистрирован: {obj.registered_at.strftime('%d.%m.%Y %H:%M')}"
                )
            except TelegramChat.DoesNotExist:
                reply = "❌ Этот чат не зарегистрирован.\nОтправьте /start для регистрации."
            self._send_message(token, chat_id, reply)

        elif text.strip() == '/help':
            reply = (
                "🤖 Elite PC Bot — команды:\n\n"
                "/start — Зарегистрировать чат для уведомлений\n"
                "/status — Проверить статус регистрации\n"
                "/help — Показать эту справку"
            )
            self._send_message(token, chat_id, reply)

    def _send_message(self, token, chat_id, text):
        try:
            requests.post(
                f'https://api.telegram.org/bot{token}/sendMessage',
                json={'chat_id': chat_id, 'text': text},
                timeout=10,
            )
        except Exception as e:
            self.stderr.write(f'  Ошибка отправки: {e}')
