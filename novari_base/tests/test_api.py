from django.test import TestCase
from rest_framework.test import APIClient

from novari_base.models import Product, User


class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(
            name='Test Tee',
            price=100.0,
            description='A test product',
            category='Basics',
            color='White',
            colors=['White'],
            images=['/assets/T-shirt placeholder.webp'],
        )
        self.admin = User(
            email='admin@test.com',
            name='Test Admin',
            role=User.ROLE_ADMIN,
        )
        self.admin.set_password('password123')
        self.admin.save()

    def test_get_products_returns_list(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Test Tee')

    def test_post_order_creates_order(self):
        response = self.client.post(
            '/api/orders/',
            {
                'email': 'customer@test.com',
                'phone': '1234567890',
                'firstname': 'John',
                'lastname': 'Doe',
                'address': '123 Main St',
                'city': 'Cairo',
                'payment_method': 'card',
                'items': [{'product_id': self.product.id, 'quantity': 1}],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('success', response.json())

    def test_admin_login_returns_token(self):
        response = self.client.post(
            '/api/admin/login/',
            {'email': 'admin@test.com', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.json())

    def test_unauthorized_admin_products_returns_401(self):
        response = self.client.get('/api/admin/products/')
        self.assertEqual(response.status_code, 401)

    def test_admin_orders_requires_auth(self):
        response = self.client.get('/api/admin/orders/')
        self.assertEqual(response.status_code, 401)

    def test_admin_orders_returns_submitted_order(self):
        self.client.post(
            '/api/orders/',
            {
                'email': 'buyer@test.com',
                'phone': '5551234567',
                'firstname': 'Jane',
                'lastname': 'Smith',
                'address': '456 Oak Ave',
                'city': 'Alexandria',
                'payment_method': 'cash',
                'items': [
                    {
                        'product_id': self.product.id,
                        'name': 'Test Tee',
                        'color': 'White',
                        'size': 'M',
                        'quantity': 2,
                        'unit_price': 100.0,
                    }
                ],
            },
            format='json',
        )

        login = self.client.post(
            '/api/admin/login/',
            {'email': 'admin@test.com', 'password': 'password123'},
            format='json',
        )
        token = login.json()['token']

        response = self.client.get(
            '/api/admin/orders/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        order = data[0]
        self.assertEqual(order['email'], 'buyer@test.com')
        self.assertEqual(order['item_count'], 2)
        self.assertEqual(order['total'], 200.0)
        self.assertEqual(len(order['items']), 1)
