import logging
import threading
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView


class OrderCreateThrottle(SimpleRateThrottle):
    scope = 'order_create'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = str(request.user.id)
        else:
            xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
            ident = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', 'unknown')
        return self.cache_format % {'scope': self.scope, 'ident': ident}

from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.orders.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Non-blocking notification helpers
# ---------------------------------------------------------------------------

def _send_order_notification_async(order_id):
    """
    Send order notification in a background thread (non-blocking).
    Uses threading directly for immediate delivery — Celery worker may
    not be running, causing .delay() to silently queue without processing.
    """
    def _run():
        try:
            from apps.notifications.services import notify_new_order
            o = Order.objects.prefetch_related(
                'items__product', 'items__configuration',
            ).get(id=order_id)
            notify_new_order(o)
        except Exception as e:
            logger.error("Background order notification failed: %s", e)

    threading.Thread(target=_run, daemon=True).start()


def _send_status_notification_async(order_id, old_status, new_status):
    """
    Send status-change notification in a background thread (non-blocking).
    """
    def _run():
        try:
            from apps.notifications.services import notify_status_change
            o = Order.objects.get(id=order_id)
            notify_status_change(o, old_status, new_status)
        except Exception as e:
            logger.error("Background status notification failed: %s", e)

    threading.Thread(target=_run, daemon=True).start()


class OrderCreateView(APIView):
    """POST /api/v1/orders/ - создать заказ."""
    permission_classes = [AllowAny]
    throttle_classes = [OrderCreateThrottle]

    def post(self, request):
        serializer = OrderCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        is_guest = not request.user.is_authenticated

        order = Order(
            user=request.user if not is_guest else None,
            customer_name=data['customer_name'],
            customer_phone=data['customer_phone'],
            customer_email=data.get('customer_email', ''),
            customer_city=data.get('customer_city', ''),
            customer_address=data.get('customer_address', ''),
            delivery_method=data.get('delivery_method', 'pickup'),
            comment=data.get('comment', ''),
            is_guest_order=is_guest,
        )
        order.save()

        total_price = Decimal('0.00')
        order_items = []
        used_server_cart = False

        if not is_guest:
            cart_items = CartItem.objects.filter(
                user=request.user
            ).select_related('product', 'configuration')

            if cart_items.exists():
                used_server_cart = True
                for cart_item in cart_items:
                    if cart_item.product:
                        if not cart_item.product.is_active or cart_item.product.stock_quantity < cart_item.quantity:
                            continue
                        price = cart_item.product.current_price
                        assembly_fee = Decimal('0.00')
                        order_item = OrderItem(
                            order=order,
                            product=cart_item.product,
                            configuration=None,
                            quantity=cart_item.quantity,
                            price_at_purchase=price,
                            is_assembled=False,
                            assembly_fee=assembly_fee,
                        )
                        from apps.products.models import Product as ProductModel
                        ProductModel.objects.filter(pk=cart_item.product.pk).update(
                            stock_quantity=F('stock_quantity') - cart_item.quantity
                        )
                    elif cart_item.configuration:
                        price = cart_item.configuration.total_price
                        assembly_fee = (
                            cart_item.configuration.assembly_fee
                            if cart_item.with_assembly
                            else Decimal('0.00')
                        )
                        order_item = OrderItem(
                            order=order,
                            product=None,
                            configuration=cart_item.configuration,
                            quantity=cart_item.quantity,
                            price_at_purchase=price,
                            is_assembled=cart_item.with_assembly,
                            assembly_fee=assembly_fee,
                        )
                    else:
                        continue

                    order_items.append(order_item)
                    total_price += (price + assembly_fee) * cart_item.quantity

                OrderItem.objects.bulk_create(order_items)
                cart_items.delete()

        # Use items from request body (for guests, or authenticated with empty server cart)
        if not used_server_cart:
            from apps.products.models import Product
            from apps.configurator.models import PCConfiguration

            request_items = request.data.get('items', [])
            for gi in request_items:
                product_id = gi.get('product_id')
                configuration_id = gi.get('configuration_id')
                quantity = int(gi.get('quantity', 1))
                with_assembly = gi.get('with_assembly', False)

                if product_id:
                    try:
                        product = Product.objects.get(pk=product_id, is_active=True)
                    except Product.DoesNotExist:
                        continue
                    if product.stock_quantity < quantity:
                        continue
                    price = product.current_price
                    order_item = OrderItem(
                        order=order,
                        product=product,
                        quantity=quantity,
                        price_at_purchase=price,
                        is_assembled=False,
                        assembly_fee=Decimal('0.00'),
                    )
                    order_items.append(order_item)
                    total_price += price * quantity
                    Product.objects.filter(pk=product.pk).update(
                        stock_quantity=F('stock_quantity') - quantity
                    )
                elif configuration_id:
                    try:
                        config = PCConfiguration.objects.get(pk=configuration_id)
                    except PCConfiguration.DoesNotExist:
                        continue
                    price = config.total_price
                    assembly_fee = config.assembly_fee if with_assembly else Decimal('0.00')
                    order_item = OrderItem(
                        order=order,
                        configuration=config,
                        quantity=quantity,
                        price_at_purchase=price,
                        is_assembled=with_assembly,
                        assembly_fee=assembly_fee,
                    )
                    order_items.append(order_item)
                    total_price += (price + assembly_fee) * quantity

            OrderItem.objects.bulk_create(order_items)

        if not order_items:
            order.delete()
            return Response(
                {'detail': 'Нет доступных товаров для заказа (проверьте наличие).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.total_price = total_price
        order.save(update_fields=['total_price'])

        # Send Telegram notification (always non-blocking).
        # Wrapped in try/except so the HTTP response is NEVER affected.
        try:
            _send_order_notification_async(order.id)
        except Exception as e:
            logger.error("Failed to start order notification: %s", e)

        # Re-fetch order with prefetched relations for serialization.
        # Wrapped in try/except: if serialization fails, return minimal data
        # so the frontend always sees a successful order.
        try:
            order = Order.objects.prefetch_related(
                'items__product', 'items__configuration',
                'status_history',
            ).get(id=order.id)
            result = OrderDetailSerializer(order).data
        except Exception as e:
            logger.error("Order serialization failed (order %s): %s", order.id, e)
            result = {
                'id': order.id,
                'order_number': order.order_number,
                'total_price': str(order.total_price),
                'status': order.status,
            }

        return Response(result, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """GET /api/v1/orders/<order_number>/ - детали заказа."""
    permission_classes = [AllowAny]

    def get(self, request, order_number):
        try:
            order = Order.objects.prefetch_related(
                'items__product', 'items__configuration',
                'status_history__changed_by',
            ).get(order_number=order_number)
        except Order.DoesNotExist:
            return Response(
                {'detail': 'Заказ не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)


class MyOrdersView(APIView):
    """GET /api/v1/orders/my/ - заказы пользователя."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(
            user=request.user
        ).prefetch_related('items').order_by('-created_at')

        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)


class OrderStatusUpdateView(APIView):
    """PATCH /api/v1/orders/<id>/status/ - смена статуса (staff)."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from apps.products.models import Product as ProductModel

        with transaction.atomic():
            try:
                # select_for_update prevents race conditions on concurrent requests
                order = Order.objects.select_for_update().get(pk=pk)
            except Order.DoesNotExist:
                return Response(
                    {'detail': 'Заказ не найден.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = OrderStatusUpdateSerializer(
                data=request.data, context={'order': order}
            )
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

            old_status = order.status
            new_status = data['status']

            # ── Stock restoration on cancellation ──────────────────────────
            # Restore stock only if transitioning TO cancelled from a non-cancelled
            # state, so double-restoration is impossible.
            if new_status == 'cancelled' and old_status != 'cancelled':
                items = order.items.filter(product__isnull=False).select_related('product')
                for item in items:
                    ProductModel.objects.filter(pk=item.product_id).update(
                        stock_quantity=F('stock_quantity') + item.quantity
                    )
                logger.info(
                    "Stock restored for order %s (items: %d)",
                    order.order_number, items.count(),
                )

            OrderStatusHistory.objects.create(
                order=order,
                old_status=old_status,
                new_status=new_status,
                changed_by=request.user,
                comment=data.get('comment', ''),
            )

            order.status = new_status
            order.save(update_fields=['status'])

        # Send Telegram notification outside the transaction (non-blocking)
        try:
            _send_status_notification_async(order.id, old_status, new_status)
        except Exception as e:
            logger.error("Failed to start status notification: %s", e)

        try:
            order = Order.objects.prefetch_related(
                'items__product', 'items__configuration',
                'status_history__changed_by',
            ).get(id=order.id)
            result = OrderDetailSerializer(order).data
        except Exception as e:
            logger.error("Order serialization failed (order %s): %s", order.id, e)
            result = {
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status,
            }

        return Response(result)
