from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken


class _IPThrottle(SimpleRateThrottle):
    """Base throttle that identifies requests by real IP."""
    def get_cache_key(self, request, view):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ident = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', 'unknown')
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class LoginRateThrottle(_IPThrottle):
    scope = 'login'


class RegisterRateThrottle(_IPThrottle):
    scope = 'register'

from apps.users.models import UserProfile, Wishlist
from apps.users.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    UserSerializer,
    WishlistSerializer,
)
from apps.orders.models import Order

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ -- register a new user and return JWT tokens."""

    queryset = User.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Ensure profile exists (signal should create it, but just in case)
        UserProfile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/v1/auth/login/ -- authenticate and return JWT tokens."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        login_value = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Allow login by email or username
        user = User.objects.filter(email=login_value).first()
        if user is None:
            user = User.objects.filter(username=login_value).first()

        if user is None or not user.check_password(password):
            return Response(
                {'detail': 'Неверный email/логин или пароль.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'detail': 'Аккаунт деактивирован.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    """
    GET  /api/v1/auth/profile/ -- retrieve current user profile.
    PUT  /api/v1/auth/profile/ -- update current user profile.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_data = UserSerializer(request.user).data
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile_data = UserProfileSerializer(profile).data
        return Response({**user_data, 'profile': profile_data})

    def put(self, request):
        user_serializer = UserSerializer(request.user, data=request.data, partial=True)
        user_serializer.is_valid(raise_exception=True)
        user_serializer.save()

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if 'avatar' in request.FILES:
            avatar_file = request.FILES['avatar']
            import os as _os
            _allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
            _allowed_exts = {'.jpg', '.jpeg', '.png', '.webp'}
            if avatar_file.size > 4 * 1024 * 1024:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'avatar': 'Максимальный размер аватара — 4 МБ.'})
            if getattr(avatar_file, 'content_type', '') not in _allowed_types:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'avatar': 'Недопустимый формат. Разрешены JPEG, PNG, WebP.'})
            if _os.path.splitext(avatar_file.name)[1].lower() not in _allowed_exts:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'avatar': 'Недопустимое расширение файла.'})
            profile_serializer = UserProfileSerializer(
                profile, data={'avatar': avatar_file}, partial=True
            )
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()

        user_data = UserSerializer(request.user).data
        profile_data = UserProfileSerializer(profile).data
        return Response({**user_data, 'profile': profile_data})


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/ -- change user password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Пароль успешно изменён.'})


class OrderHistoryView(generics.ListAPIView):
    """GET /api/v1/auth/orders/history/ -- list orders for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('user')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        orders = queryset.values(
            'id', 'order_number', 'status', 'total_price',
            'discount_amount', 'delivery_method', 'created_at', 'updated_at',
        )
        return Response(list(orders))


class WishlistView(APIView):
    """
    GET  /api/v1/wishlist/            -- list wishlist items (returns Product objects).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.products.models import Product
        from apps.products.serializers import ProductListSerializer

        product_ids = Wishlist.objects.filter(
            user=request.user
        ).values_list('product_id', flat=True)
        products = Product.objects.filter(
            id__in=product_ids, is_active=True
        ).select_related('category', 'brand')
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)


class WishlistDetailView(APIView):
    """
    POST   /api/v1/wishlist/{product_id}/ -- add product to wishlist.
    DELETE /api/v1/wishlist/{product_id}/ -- remove product from wishlist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, product_id):
        from apps.products.models import Product

        product = get_object_or_404(Product, id=product_id, is_active=True)
        wishlist_item, created = Wishlist.objects.get_or_create(
            user=request.user, product=product,
        )
        if not created:
            return Response(
                {'detail': 'Товар уже в избранном.'},
                status=status.HTTP_200_OK,
            )
        serializer = WishlistSerializer(wishlist_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def delete(self, request, product_id):
        wishlist_item = get_object_or_404(
            Wishlist, user=request.user, product_id=product_id,
        )
        wishlist_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
