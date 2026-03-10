import logging
import requests as http_requests
from django.conf import settings

logger = logging.getLogger(__name__)


def format_order_message(order):
    items_text = ""
    for i, item in enumerate(order.items.all(), 1):
        if item.product:
            name = item.product.name
        elif item.configuration:
            name = f"[Сборка ПК] {item.configuration.name or 'Конфигурация'}"
        else:
            name = "Товар"
        items_text += f"  {i}. {name} — {item.quantity} шт. — {item.price_at_purchase} сом.\n"
        if item.assembly_fee:
            items_text += f"     💰 Сборка: {item.assembly_fee} сом.\n"

    delivery = "Самовывоз" if order.delivery_method == 'pickup' else "Курьером"
    comment = f"\n💬 Комментарий: {order.comment}" if order.comment else ""

    message = (
        f"🛒 НОВЫЙ ЗАКАЗ #{order.order_number}\n\n"
        f"👤 Клиент: {order.customer_name}\n"
        f"📞 Телефон: {order.customer_phone}\n"
        f"📧 Email: {order.customer_email or '—'}\n"
        f"🏙 Город: {order.customer_city or '—'}\n"
        f"📍 Адрес: {order.customer_address or '—'}\n\n"
        f"📦 Товары:\n{items_text}\n"
        f"💵 Итого: {order.total_price} сом.\n"
        f"🚚 Доставка: {delivery}"
        f"{comment}\n\n"
        f"⏰ Создан: {order.created_at.strftime('%d.%m.%Y %H:%M')}"
    )
    return message


def _send_to_chat(token, chat_id, message):
    """Send a single message to a specific Telegram chat."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {'chat_id': str(chat_id), 'text': message}
    try:
        resp = http_requests.post(url, json=payload, timeout=(3, 5))
        if resp.status_code == 200:
            logger.info("Telegram notification sent to %s", chat_id)
        else:
            logger.error("Telegram API error %s for chat %s: %s", resp.status_code, chat_id, resp.text)
    except Exception as e:
        logger.error("Failed to send to chat %s: %s", chat_id, e)


def send_telegram_notification(message):
    """Send a message to all approved Telegram chats."""
    from apps.notifications.models import NotificationSettings, TelegramChat

    try:
        ns = NotificationSettings.get_settings()
        if not ns.is_active:
            return

        token = ns.telegram_bot_token or getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if not token:
            logger.warning("Telegram bot token not configured")
            return

        approved_chats = TelegramChat.objects.filter(status='approved')

        if approved_chats.exists():
            for chat in approved_chats:
                _send_to_chat(token, chat.chat_id, message)
        else:
            # Fallback: use legacy channel_id if no approved chats
            channel_id = ns.telegram_channel_id or getattr(settings, 'TELEGRAM_CHANNEL_ID', '')
            if channel_id:
                _send_to_chat(token, channel_id, message)
            else:
                logger.warning("No approved Telegram chats and no legacy channel_id configured")
    except Exception as e:
        logger.error("Failed to send Telegram notification: %s", e)


def notify_new_order(order):
    from apps.notifications.models import NotificationSettings
    ns = NotificationSettings.get_settings()
    if ns.notify_on_new_order:
        message = format_order_message(order)
        send_telegram_notification(message)


def notify_status_change(order, old_status, new_status):
    from apps.notifications.models import NotificationSettings
    ns = NotificationSettings.get_settings()
    if ns.notify_on_status_change:
        status_names = dict(order.STATUS_CHOICES)
        message = (
            f"📋 Смена статуса заказа #{order.order_number}\n\n"
            f"👤 Клиент: {order.customer_name}\n"
            f"📞 Телефон: {order.customer_phone}\n\n"
            f"🔄 {status_names.get(old_status, old_status)} → "
            f"{status_names.get(new_status, new_status)}"
        )
        send_telegram_notification(message)


def notify_low_stock(product):
    from apps.notifications.models import NotificationSettings
    ns = NotificationSettings.get_settings()
    if ns.notify_on_low_stock:
        message = (
            f"⚠️ Низкий остаток!\n\n"
            f"Товар: {product.name}\n"
            f"Артикул: {product.sku}\n"
            f"Остаток: {product.stock_quantity} шт."
        )
        send_telegram_notification(message)
