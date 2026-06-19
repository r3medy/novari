from novari_base.models import Order, Product


def _absolute_media_url(path: str, request=None) -> str:
    if request and path and path.startswith('/media/'):
        return request.build_absolute_uri(path)
    return path


def serialize_product(product: Product, request=None) -> dict:
    images = [_absolute_media_url(img, request) for img in product.get_images_list()]
    return {
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'description': product.description,
        'discount': product.discount,
        'category': product.category,
        'colors': product.get_colors_list(),
        'images': images,
        'in_stock': product.in_stock,
        'stock_count': product.stock_count,
        'sales': product.sales,
        # Legacy single-value fields for backward compatibility
        'color': product.color,
        'image': images[0] if images else '',
    }


def product_from_request_data(data: dict, product: Product | None = None) -> Product:
    if product is None:
        product = Product()

    if 'name' in data:
        product.name = data['name']
    if 'description' in data:
        product.description = data['description']
    if 'price' in data:
        product.price = data['price']
    if 'discount' in data:
        product.discount = data['discount']
    if 'category' in data:
        product.category = data['category']
    if 'in_stock' in data:
        product.in_stock = data['in_stock']
    if 'stock_count' in data:
        product.stock_count = data['stock_count']
    if 'sales' in data:
        product.sales = data['sales']

    if 'colors' in data and isinstance(data['colors'], list):
        product.colors = data['colors']
        if data['colors']:
            product.color = data['colors'][0]
    elif 'color' in data:
        product.color = data['color']
        product.colors = [data['color']] if data['color'] else []

    if 'images' in data and isinstance(data['images'], list):
        product.images = data['images']
    elif 'image' in data:
        product.images = [data['image']] if data['image'] else []

    return product


def serialize_order(order: Order) -> dict:
    items = order.items if isinstance(order.items, list) else []
    line_items = [item for item in items if isinstance(item, dict)]
    total = sum(
        (item.get('unit_price', 0) or 0) * (item.get('quantity', 0) or 0)
        for item in line_items
    )
    item_count = sum((item.get('quantity', 0) or 0) for item in line_items)

    return {
        'id': order.id,
        'email': order.Email,
        'phone': order.Phone,
        'firstname': order.FirstName,
        'lastname': order.LastName,
        'address': order.Address,
        'city': order.city,
        'payment_method': order.payment_method,
        'order_notes': order.Order_Notes,
        'created_at': order.created_at.isoformat(),
        'items': line_items,
        'total': total,
        'item_count': item_count,
    }
