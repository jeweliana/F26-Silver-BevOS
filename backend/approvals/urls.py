from django.urls import path
from . import views

app_name = "approvals"

urlpatterns = [
    path("approvals/", views.approval_list, name="approval-list"),
]