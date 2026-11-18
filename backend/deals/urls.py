from django.urls import path
from . import views

app_name = "deals"

urlpatterns = [
    path("deals/", views.deal_list, name="deal-list"),
    path("deals/<int:deal_id>/", views.deal_update, name="deal-update"),
    path("clients/", views.client_list, name="client-list"),
    path("statuses/", views.status_list, name="status-list"),
    path("deals/<int:deal_id>/", views.deal_detail, name="deal-detail"),
    path("deals/<int:deal_id>/detail/", views.deal_detail, name="deal-detail"),
]