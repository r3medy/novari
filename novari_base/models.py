from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class User(models.Model):
    """Application admin user (not Django admin)."""
    ROLE_ADMIN = 'admin'
    ROLE_MANAGER = 'manager'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_MANAGER, 'Manager'),
    ]

    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=100)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_ADMIN)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    @property
    def is_admin(self):
        return self.is_active and self.role == self.ROLE_ADMIN

    class Meta:
        db_table = 'User'

    def __str__(self):
        return self.email


class AdminToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'AdminToken'

    def __str__(self):
        return f"Token for {self.user.email}"


class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(default='')
    image = models.ImageField(upload_to='products', default='not uploaded')
    discount = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        default=0.0,
    )
    price = models.FloatField()
    color = models.CharField(max_length=100, default='white')
    category = models.CharField(max_length=100, default='Uncategorized')
    colors = models.JSONField(default=list, blank=True)
    images = models.JSONField(default=list, blank=True)
    in_stock = models.BooleanField(default=True)
    stock_count = models.PositiveIntegerField(default=0)
    sales = models.PositiveIntegerField(default=0)

    def get_colors_list(self):
        if self.colors:
            return self.colors
        return [self.color] if self.color else []

    def get_images_list(self):
        if self.images:
            return self.images
        if self.image and str(self.image) != 'not uploaded':
            return [self.image.url if hasattr(self.image, 'url') else str(self.image)]
        return []


class Order(models.Model):
    Email = models.EmailField(unique=False, db_index=True)
    Phone = models.CharField(max_length=20, unique=False, db_index=True)
    FirstName = models.CharField(max_length=100)
    LastName = models.CharField(max_length=100)
    Address = models.TextField(default='')
    city = models.CharField(max_length=100)
    payment_method = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    Order_Notes = models.TextField(default='')
    items = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'Orders'
