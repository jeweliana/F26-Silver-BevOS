from django.conf import settings
from django.db import models


class ApprovalRequest(models.Model):
    class ApprovalType(models.TextChoices):
        ARTWORK = "artwork", "Artwork"
        PURCHASE_ORDER = "purchase_order", "Purchase Order"
        PRODUCTION = "production", "Production Schedule"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.PROTECT,
        related_name="approval_requests",
    )

    approval_type = models.CharField(
        max_length=30,
        choices=ApprovalType.choices,
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_approvals",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    reviewer_comments = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "approval_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
