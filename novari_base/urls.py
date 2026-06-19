from django.urls import path

from novari_base import views

urlpatterns = [
    path("api/products/", views.ProductListView.as_view()),
    path("api/products/<int:id>/", views.ProductDetailView.as_view()),
    path("api/admin/login/", views.AdminLoginView.as_view()),
    path("api/admin/logout/", views.AdminLogoutView.as_view()),
    path("api/admin/products/", views.AdminProductsView.as_view()),
    path("api/admin/products/<int:id>/", views.AdminProductDeleteView.as_view()),
    path("api/admin/upload/", views.AdminImageUploadView.as_view()),
    path("api/admin/orders/", views.AdminOrdersView.as_view()),
    path("api/orders/", views.SubmitOrderView.as_view()),
]
