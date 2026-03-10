from celery import shared_task


@shared_task
def send_order_notification(order_id):
    from apps.orders.models import Order
    from apps.notifications.services import notify_new_order
    try:
        order = Order.objects.prefetch_related('items__product', 'items__configuration').get(id=order_id)
        notify_new_order(order)
    except Order.DoesNotExist:
        pass


@shared_task
def send_status_change_notification(order_id, old_status, new_status):
    from apps.orders.models import Order
    from apps.notifications.services import notify_status_change
    try:
        order = Order.objects.get(id=order_id)
        notify_status_change(order, old_status, new_status)
    except Order.DoesNotExist:
        pass


@shared_task
def send_daily_report():
    import datetime
    from django.db.models import Sum, Count
    from django.utils import timezone
    from apps.orders.models import Order
    from apps.notifications.services import send_telegram_notification

    today = timezone.now().date()
    orders_today = Order.objects.filter(created_at__date=today)
    stats = orders_today.aggregate(
        count=Count('id'),
        total=Sum('total_price')
    )

    completed = orders_today.filter(status='completed').count()
    cancelled = orders_today.filter(status='cancelled').count()

    message = (
        f"Ежедневный отчёт — {today.strftime('%d.%m.%Y')}\n\n"
        f"Заказов: {stats['count'] or 0}\n"
        f"Выручка: {stats['total'] or 0} сом.\n"
        f"Выполнено: {completed}\n"
        f"Отменено: {cancelled}"
    )
    send_telegram_notification(message)


@shared_task
def check_low_stock():
    from apps.products.models import Product
    from apps.notifications.models import NotificationSettings
    from apps.notifications.services import notify_low_stock

    ns = NotificationSettings.get_settings()
    threshold = ns.low_stock_threshold

    low_stock_products = Product.objects.filter(
        is_active=True,
        stock_quantity__gt=0,
        stock_quantity__lte=threshold
    )
    for product in low_stock_products:
        notify_low_stock(product)
