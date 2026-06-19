import os
import secrets

from django.core.management.base import BaseCommand

from novari_base.models import Product, User

PLACEHOLDER_IMAGE = '/assets/T-shirt placeholder.webp'

SAMPLE_PRODUCTS = [
    {
        'name': 'Essential Cotton Tee',
        'description': 'Soft everyday cotton tee with a relaxed fit.',
        'price': 450.0,
        'discount': 0.0,
        'category': 'Basics',
        'color': 'Black',
        'colors': ['Black', 'White', 'Charcoal'],
        'images': [PLACEHOLDER_IMAGE],
        'in_stock': True,
        'stock_count': 120,
        'sales': 34,
    },
    {
        'name': 'Heritage Logo Tee',
        'description': 'Premium heavyweight tee with embroidered Novari mark.',
        'price': 680.0,
        'discount': 10.0,
        'category': 'Signature',
        'color': 'Cream',
        'colors': ['Cream', 'Obsidian'],
        'images': [PLACEHOLDER_IMAGE],
        'in_stock': True,
        'stock_count': 80,
        'sales': 52,
    },
    {
        'name': 'Studio Oversized Tee',
        'description': 'Dropped shoulder silhouette for a modern streetwear look.',
        'price': 520.0,
        'discount': 5.0,
        'category': 'Oversized',
        'color': 'Sand',
        'colors': ['Sand', 'Olive', 'Rust'],
        'images': [PLACEHOLDER_IMAGE],
        'in_stock': True,
        'stock_count': 65,
        'sales': 21,
    },
    {
        'name': 'Limited Edition Gold Foil Tee',
        'description': 'Small-batch release with metallic foil detailing.',
        'price': 890.0,
        'discount': 0.0,
        'category': 'Limited',
        'color': 'Obsidian',
        'colors': ['Obsidian'],
        'images': [PLACEHOLDER_IMAGE],
        'in_stock': True,
        'stock_count': 25,
        'sales': 12,
    },
]


class Command(BaseCommand):
    help = 'Seed sample products and admin user when the database is empty.'

    def handle(self, *args, **options):
        if Product.objects.exists():
            self.stdout.write('Products already exist — skipping product seed.')
        else:
            for data in SAMPLE_PRODUCTS:
                Product.objects.create(**data)
            self.stdout.write(self.style.SUCCESS(f'Seeded {len(SAMPLE_PRODUCTS)} products.'))

        if User.objects.exists():
            self.stdout.write('Admin user already exists — skipping user seed.')
            return

        email = os.environ.get('SEED_ADMIN_EMAIL', 'admin@novari.test')
        password = os.environ.get('SEED_ADMIN_PASSWORD')

        if password:
            source = 'from SEED_ADMIN_PASSWORD'
        else:
            # No password configured — generate a strong random one and print it once.
            password = secrets.token_urlsafe(12)
            source = 'auto-generated'

        user = User(
            email=email,
            name='Novari Admin',
            role=User.ROLE_ADMIN,
        )
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(
            f'Created admin user ({source}): {email} / {password}'
        ))
        self.stdout.write(self.style.WARNING(
            'Sample data only — change the admin password before production use.'
        ))
