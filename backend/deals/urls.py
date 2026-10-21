from django.urls import path
from . import views

app_name = "deals"

urlpatterns = [
    path("deals/", views.deal_list, name="deal-list"),
]