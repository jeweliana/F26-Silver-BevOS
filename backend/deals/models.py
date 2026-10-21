# deals/models.py
from django.conf import settings
from django.db import models

from core.models import Client, Status, Supplier, TimeStampedModel


class Deal(TimeStampedModel):
    deal_number = models.CharField(max_length=100, unique=True)
    deal_name = models.CharField(max_length=255)
    client = models.ForeignKey(Client, models.PROTECT, related_name="deals")
    status = models.ForeignKey(Status, models.PROTECT, related_name="deals")
    target_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, null=True, blank=True,
        related_name="deals",
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "deals"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.deal_number} — {self.deal_name}"


class ItemType(models.TextChoices):
    CARTON = "carton", "Carton"
    END = "end", "End"
    CAN = "can", "Can"
    TRAY = "tray", "Tray"


class PackagingRequirement(TimeStampedModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="packaging_requirements")
    item_type = models.CharField(max_length=30, choices=ItemType.choices)
    specification = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    uom = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "packaging_requirements"


class Specification(TimeStampedModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="specifications")
    item_type = models.CharField(max_length=30, choices=ItemType.choices)
    spec_name = models.CharField(max_length=200)
    spec_value = models.TextField(blank=True)
    unit = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "specifications"


class MoneyModel(TimeStampedModel):
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        abstract = True


class CustomerQuote(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="customer_quotes")
    client = models.ForeignKey(Client, models.PROTECT, related_name="quotes")
    quote_number = models.CharField(max_length=100, unique=True)
    quote_date = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "customer_quotes"


class CustomerPO(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="customer_pos")
    client = models.ForeignKey(Client, models.PROTECT, related_name="pos")
    po_number = models.CharField(max_length=100, unique=True)
    po_date = models.DateField(null=True, blank=True)
    expected_ship_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "customer_pos"


class CustomerInvoice(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="customer_invoices")
    client = models.ForeignKey(Client, models.PROTECT, related_name="invoices")
    invoice_number = models.CharField(max_length=100, unique=True)
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "customer_invoices"


class SupplierQuote(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="supplier_quotes")
    supplier = models.ForeignKey(Supplier, models.PROTECT, related_name="quotes")
    quote_number = models.CharField(max_length=100)
    quote_date = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "supplier_quotes"
        constraints = [
            models.UniqueConstraint(
                fields=["supplier", "quote_number"], name="uniq_supplier_quote_no",
            ),
        ]


class NicePackagePO(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="supplier_pos")
    supplier = models.ForeignKey(Supplier, models.PROTECT, related_name="pos")
    po_number = models.CharField(max_length=100, unique=True)
    po_date = models.DateField(null=True, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "nice_package_pos"


class SupplierInvoice(MoneyModel):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="supplier_invoices")
    supplier = models.ForeignKey(Supplier, models.PROTECT, related_name="invoices")
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "supplier_invoices"
        constraints = [
            models.UniqueConstraint(
                fields=["supplier", "invoice_number"], name="uniq_supplier_invoice_no",
            ),
        ]


class Document(TimeStampedModel):
    class ModuleType(models.TextChoices):
        DEAL = "deal", "Deal"
        CLIENT_PO = "client_po", "Client PO"
        CLIENT_INVOICE = "client_invoice", "Client Invoice"
        SUPPLIER_PO = "supplier_po", "Supplier PO"
        SUPPLIER_INVOICE = "supplier_invoice", "Supplier Invoice"
        QUOTE = "quote", "Quote"
        MODULE_ITEM = "module_item", "Module Item"
        GENERAL = "general", "General"

    deal = models.ForeignKey(Deal, models.CASCADE, related_name="documents")
    module_type = models.CharField(max_length=40, choices=ModuleType.choices)
    module_id = models.IntegerField(null=True, blank=True)
    file_name = models.CharField(max_length=255)
    file_path = models.TextField()
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, null=True, blank=True,
        related_name="documents",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "documents"


class StatusHistory(models.Model):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="status_history")
    status = models.ForeignKey(Status, models.PROTECT, related_name="history_entries")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, null=True, blank=True,
        related_name="status_changes",
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "status_history"
        ordering = ["-changed_at"]


class DealNote(models.Model):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="deal_notes")
    note_text = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, null=True, blank=True,
        related_name="deal_notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_notes"
        ordering = ["-created_at"]


class DealActivity(models.Model):
    deal = models.ForeignKey(Deal, models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.SET_NULL, null=True, blank=True,
        related_name="deal_activities",
    )
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_activities"
        ordering = ["-performed_at"]