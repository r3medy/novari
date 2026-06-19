# Generated manually for frontend integration

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('novari_base', '0004_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='category',
            field=models.CharField(default='Uncategorized', max_length=100),
        ),
        migrations.AddField(
            model_name='product',
            name='colors',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='product',
            name='images',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='product',
            name='in_stock',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='product',
            name='sales',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='product',
            name='stock_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='order',
            name='items',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name='product',
            name='discount',
            field=models.FloatField(
                default=0.0,
                validators=[
                    django.core.validators.MinValueValidator(0.0),
                    django.core.validators.MaxValueValidator(100.0),
                ],
            ),
        ),
    ]
