from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from django.db.models import Count, QuerySet, Sum
from django.utils import timezone

from deals.models import CustomerInvoice, CustomerQuote, Deal, SupplierInvoice

OPEN_QUOTE_STATUSES = ["Quote Draft", "Quote Sent"]
CUSTOMER_INVOICE_PAID = "Customer Invoice Paid"
SUPPLIER_INVOICE_PAID = "Supplier Invoice Paid"
DEAL_COMPLETED = "Completed"

def _total(qs: QuerySet) -> Decimal:
    """
    Sum the total_amount column of a money queryset.

    Args:
        qs (QuerySet): Any queryset of a MoneyModel subclass.

    Returns:
        Decimal: The sum, or 0 when there are no rows.
    """
    return qs.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")

def deals_by_status() -> dict:
    """
    Count deals grouped by their current status.

    Returns:
        dict: Status name mapped to deal count, in workflow order.
    """
    rows = (
        Deal.objects.values("status__status_name")
        .annotate(count=Count("id"))
        .order_by("status__sort_order")
    )
    return {row["status__status_name"]: row["count"] for row in rows}

def summary(*, today: Optional[date] = None, window_dats: int = 30) -> dict:
    """
    Build the headline numbers for the analytics dashboard.

    Args:
        today (Optional[date]): Reference date. Defaults to Nthe current date.
        window_dats (int, optional): How far ahead to look for upcoming target dates. Defaults to 30.

    Returns:
        dict: Deal counts and money totals for the dashboard.
    """
    today = today or timezone.localdate()
    window_end = today + timedelta(days=window_dats)
    
    return {
        "total_deals": Deal.objects.count(),
        "deals_by_status": deals_by_status(),
        "deals_due_soon": (
            Deal.objects.exclude(status__status_name=DEAL_COMPLETED)
            .filter(target_date__range=(today, window_end))
            .count()
        ),
        "open_quote_value": _total(
            CustomerQuote.objects.filter(status__in=OPEN_QUOTE_STATUSES)
        ),
        "receivables_outstanding": _total(
            CustomerInvoice.objects.exclude(status=CUSTOMER_INVOICE_PAID)
        ),
        "payables_outstanding": _total(
            SupplierInvoice.objects.exclude(status=SUPPLIER_INVOICE_PAID)  
        ),
    }