#!/bin/sh
set -e

APP_DIR="${APP_DIR:-/var/www/elitepc}"
BASE_URL="${1:-${BASE_URL:-https://elitepc.tj}}"

echo "Elite PC Telegram setup"
echo "APP_DIR:  $APP_DIR"
echo "BASE_URL: $BASE_URL"

cd "$APP_DIR"

if [ ! -f ".venv/bin/activate" ]; then
  echo "Python virtualenv not found at $APP_DIR/.venv"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo ".env not found at $APP_DIR/.env"
  exit 1
fi

. "$APP_DIR/.venv/bin/activate"
export DJANGO_SETTINGS_MODULE=config.settings.local
export PYTHONPATH="$APP_DIR/backend"
set -a
. "$APP_DIR/.env"
set +a

cd "$APP_DIR/backend"

python manage.py shell -c "from apps.notifications.models import NotificationSettings; ns=NotificationSettings.get_settings(); print('Telegram token configured:', bool(ns.telegram_bot_token or '')); print('Telegram channel configured:', bool(ns.telegram_channel_id or '')); print('Notifications active:', ns.is_active)"

python manage.py setup_telegram_webhook --base-url "$BASE_URL"

echo ""
echo "Webhook configured."
echo "Next steps:"
echo "1. Open your bot in Telegram and send /start"
echo "2. Approve the chat in the admin panel"
echo "3. Send a test notification from Django shell if needed"
echo ""
echo "Admin panel: $BASE_URL/admin/"
