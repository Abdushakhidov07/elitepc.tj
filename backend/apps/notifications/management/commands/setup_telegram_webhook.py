import hashlib

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.notifications.models import NotificationSettings


class Command(BaseCommand):
    help = 'Register the Telegram webhook URL with the Bot API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--base-url', type=str, required=True,
            help='Public base URL (e.g. https://elitepc.tj)',
        )

    def handle(self, *args, **options):
        ns = NotificationSettings.get_settings()
        token = ns.telegram_bot_token or getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if not token:
            self.stderr.write(self.style.ERROR('TELEGRAM_BOT_TOKEN is not configured.'))
            return

        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        base_url = options['base_url'].rstrip('/')
        webhook_url = f"{base_url}/api/v1/telegram/webhook/{token_hash}/"

        self.stdout.write(f"Setting webhook URL: {webhook_url}")

        resp = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={'url': webhook_url},
            timeout=10,
        )
        data = resp.json()

        if data.get('ok'):
            self.stdout.write(self.style.SUCCESS(f"Webhook set successfully: {data}"))
        else:
            self.stderr.write(self.style.ERROR(f"Failed to set webhook: {data}"))
