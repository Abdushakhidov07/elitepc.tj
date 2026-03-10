from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.cart.serializers import (
    CartItemSerializer,
    CartAddSerializer,
    CartUpdateSerializer,
)


class CartView(APIView):
    """GET - список элементов корзины авторизованного пользователя."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = CartItem.objects.filter(user=request.user).select_related(
            'product', 'configuration'
        )
        serializer = CartItemSerializer(items, many=True)
        total = sum(item.item_total for item in items)
        return Response({
            'items': serializer.data,
            'total': str(total),
            'count': items.count(),
        })


class CartAddView(APIView):
    """POST - добавить товар или конфигурацию в корзину."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        product_id = data.get('product_id')
        configuration_id = data.get('configuration_id')
        quantity = data.get('quantity', 1)
        with_assembly = data.get('with_assembly', False)

        lookup = {'user': request.user}
        if product_id:
            lookup['product_id'] = product_id
            lookup['configuration'] = None
        else:
            lookup['configuration_id'] = configuration_id
            lookup['product'] = None

        existing = CartItem.objects.filter(**lookup).first()
        if existing:
            existing.quantity += quantity
            existing.with_assembly = with_assembly
            existing.save()
            cart_item = existing
        else:
            cart_item = CartItem.objects.create(
                user=request.user,
                product_id=product_id,
                configuration_id=configuration_id,
                quantity=quantity,
                with_assembly=with_assembly,
            )

        result = CartItemSerializer(cart_item).data
        return Response(result, status=status.HTTP_201_CREATED)


class CartItemView(APIView):
    """PUT - обновить количество, DELETE - удалить элемент корзины."""
    permission_classes = [IsAuthenticated]

    def get_cart_item(self, request, item_id):
        try:
            return CartItem.objects.get(pk=item_id, user=request.user)
        except CartItem.DoesNotExist:
            return None

    def put(self, request, item_id):
        cart_item = self.get_cart_item(request, item_id)
        if not cart_item:
            return Response(
                {'detail': 'Элемент корзины не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CartUpdateSerializer(
            data=request.data, context={'cart_item': cart_item}
        )
        serializer.is_valid(raise_exception=True)

        cart_item.quantity = serializer.validated_data['quantity']
        cart_item.save()

        result = CartItemSerializer(cart_item).data
        return Response(result)

    def delete(self, request, item_id):
        cart_item = self.get_cart_item(request, item_id)
        if not cart_item:
            return Response(
                {'detail': 'Элемент корзины не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        cart_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartClearView(APIView):
    """POST - очистить корзину."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        deleted_count, _ = CartItem.objects.filter(user=request.user).delete()
        return Response({
            'detail': 'Корзина очищена.',
            'deleted': deleted_count,
        })
