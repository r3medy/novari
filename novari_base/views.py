import secrets
import uuid
from datetime import timedelta

from django.core.files.storage import default_storage
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from novari_base.models import AdminToken, Order, Product, User
from novari_base.serializers import product_from_request_data, serialize_order, serialize_product

ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024
TOKEN_MAX_AGE = timedelta(days=30)


def _extract_token(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()
    return auth_header.strip()


def check_token(request):
    token_value = _extract_token(request.headers.get('Authorization'))
    if not token_value:
        return None
    try:
        token = AdminToken.objects.get(token=token_value)
        if token.created_at < timezone.now() - TOKEN_MAX_AGE:
            token.delete()
            return None
        return User.objects.get(id=token.user_id)
    except (AdminToken.DoesNotExist, User.DoesNotExist):
        return None


class ProductListView(APIView):
    def get(self, request):
        color = request.GET.get('color', '')
        min_price = request.GET.get('min_price', 0)

        max_available_price = Product.objects.aggregate(Max('price'))['price__max'] or 0
        max_price = request.GET.get('max_price', max_available_price)

        queryset = Product.objects.filter(
            Q(price__gte=min_price) &
            Q(price__lte=max_price)
        )
        if color:
            queryset = queryset.filter(
                Q(color__icontains=color) | Q(colors__icontains=color)
            )

        return Response([serialize_product(p, request) for p in queryset])


class ProductDetailView(APIView):
    def get(self, request, id):
        try:
            product = Product.objects.get(id=id)
            return Response(serialize_product(product, request))
        except Product.DoesNotExist:
            return Response({'error': 'Product does not exist'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminLoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_admin:
            return Response(
                {'error': 'Invalid credentials or insufficient privileges'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token_value = secrets.token_urlsafe(32)
        admin_token = AdminToken.objects.create(user=user, token=token_value)

        return Response({
            'token': admin_token.token,
            'admin': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role,
            },
        })


class AdminLogoutView(APIView):
    def post(self, request):
        token_value = _extract_token(request.headers.get('Authorization'))
        if not token_value:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        deleted, _ = AdminToken.objects.filter(token=token_value).delete()
        if deleted == 0:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({'success': 'Logged out'})


class AdminProductsView(APIView):
    def get(self, request):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response([serialize_product(p, request) for p in Product.objects.all()])

    def post(self, request):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            product = product_from_request_data(request.data)
            product.save()
            return Response(serialize_product(product, request), status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Invalid, {e}'}, status=status.HTTP_400_BAD_REQUEST)


class AdminProductDeleteView(APIView):
    def patch(self, request, id):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            product = Product.objects.get(id=id)
        except Product.DoesNotExist:
            return Response({'error': f'Product {id} does not exist'}, status=status.HTTP_404_NOT_FOUND)

        product = product_from_request_data(request.data, product)
        product.save()

        return Response({
            'success': f'Product {id} updated',
            'product': serialize_product(product, request),
        })

    def delete(self, request, id):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            product = Product.objects.get(id=id)
            product.delete()
            return Response({'success': f'Product {id} deleted'})
        except Product.DoesNotExist:
            return Response({'error': f'Product {id} does not exist'}, status=status.HTTP_404_NOT_FOUND)


class AdminImageUploadView(APIView):
    def post(self, request):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        content_type = image_file.content_type
        if content_type not in ALLOWED_IMAGE_TYPES:
            return Response({'error': 'Invalid image type'}, status=status.HTTP_400_BAD_REQUEST)

        if image_file.size > MAX_UPLOAD_SIZE:
            return Response({'error': 'Image too large'}, status=status.HTTP_400_BAD_REQUEST)

        ext = ALLOWED_IMAGE_TYPES[content_type]
        filename = f'products/{uuid.uuid4()}{ext}'
        saved_path = default_storage.save(filename, image_file)
        url = request.build_absolute_uri(default_storage.url(saved_path))
        return Response({'url': url}, status=status.HTTP_201_CREATED)


class AdminOrdersView(APIView):
    def get(self, request):
        user = check_token(request)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        orders = Order.objects.order_by('-created_at')
        return Response([serialize_order(order) for order in orders])


class SubmitOrderView(APIView):
    def post(self, request):
        try:
            items = request.data.get('items', [])
            if not isinstance(items, list):
                items = []

            new_order = Order(
                Email=request.data.get('email'),
                Phone=request.data.get('phone'),
                FirstName=request.data.get('firstname'),
                LastName=request.data.get('lastname'),
                Address=request.data.get('address'),
                city=request.data.get('city'),
                payment_method=request.data.get('payment_method'),
                Order_Notes=request.data.get('Order_Notes', ''),
                items=items,
            )
            new_order.save()
            return Response({'success': f'Order submitted at id {new_order.id}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
