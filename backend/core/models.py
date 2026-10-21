# core/models.py
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Client(TimeStampedModel):
    client_name = models.CharField(max_length=200, unique=True)
    contact_name = models.CharField(max_length=200, blank=True)
    email = models.CharField(max_length=320, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    billing_contact = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "clients"
        ordering = ["client_name"]

    def __str__(self):
        return self.client_name


class Supplier(TimeStampedModel):
    supplier_name = models.CharField(max_length=200, unique=True)
    contact_name = models.CharField(max_length=200, blank=True)
    email = models.CharField(max_length=320, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    payment_terms = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "suppliers"
        ordering = ["supplier_name"]

    def __str__(self):
        return self.supplier_name


class Status(TimeStampedModel):
    class Category(models.TextChoices):
        DEAL = "deal", "Deal"
        CUSTOMER_QUOTE = "customer_quote", "Customer Quote"
        CUSTOMER_PO = "customer_po", "Customer PO"
        CUSTOMER_INVOICE = "customer_invoice", "Customer Invoice"
        SUPPLIER_PO = "supplier_po", "Supplier PO"
        SUPPLIER_INVOICE = "supplier_invoice", "Supplier Invoice"

    status_name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "statuses"
        ordering = ["category", "sort_order"]

    def __str__(self):
        return self.status_name