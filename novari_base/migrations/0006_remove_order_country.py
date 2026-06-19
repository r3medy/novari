from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('novari_base', '0005_product_catalog_fields_order_items'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='order',
            name='country',
        ),
    ]
