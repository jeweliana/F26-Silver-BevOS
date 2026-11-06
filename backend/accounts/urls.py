from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="auth-login"),
    path("logout/", views.logout_view, name="auth-logout"),
    path("me/", views.current_user_view, name="auth-me"),
    path("admin/users/", views.admin_users_view, name="admin-users"),
    path(
        "admin/users/<int:user_id>/",
        views.admin_user_detail_view,
        name="admin-user-detail",
    ),
]