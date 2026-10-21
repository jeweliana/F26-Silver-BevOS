import logging
from datetime import date
from typing import Optional
from deals.models import Deal, StatusHistory
from core.models import Client, Status, Supplier
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

logger = logging.getLogger(__name__)
User = get_user_model()

def next_deal_number() -> str:
    """
    Generate the next deal reference for the current year.

    Reads the highest existing NPC-YYYY-NNN for this year and increments it.
    Relies on the deal_number unique constraint to reject collisions from
    simultaneous calls.

    Returns:
        str: A deal reference such as "NPC-2026-004".
    """
    year = date.today().year
    prefix = f"NPC-{year}-"
    last = (
        Deal.objects.filter(deal_number__startswith=prefix)
        .order_by("-deal_number")
        .values_list("deal_number", flat=True)
        .first()
    )
    seq = int(last[len(prefix):]) + 1 if last else 1
    return f"{prefix}{seq:03d}"


@transaction.atomic
def create_deal(*,
    client: Client,
    status: Status,
    created_by: User,
    deal_name: str,
    deal_number: Optional[str] = None,
    target_date: Optional[date] = None,
    notes: str = "",
    initial_status_note: str = "Deal created") -> Deal:
    """
    Create a new deal with the provided information.

    The deal and its opening status history row are written in one
    transaction, so a deal can never exist without an audit trail.

    Args:
        client (Client): The client associated with the deal.
        status (Status): The initial status of the deal.
        created_by (User): The user creating the deal.
        deal_name (str): The name of the deal.
        deal_number (Optional[str]): An optional deal number. Generated when omitted.
        target_date (Optional[date]): An optional target date for the deal.
        notes (str): Optional notes for the deal.
        initial_status_note (str): The initial status note for the deal.

    Returns:
        Deal: The created deal object.
    """
    deal = Deal.objects.create(
        client=client,
        status=status,
        created_by=created_by,
        deal_name=deal_name,
        deal_number=deal_number or next_deal_number(),
        target_date=target_date,
        notes=notes,
    )
    StatusHistory.objects.create(
        deal=deal,
        status=status,
        changed_by=created_by,
        notes=initial_status_note,
    )
    logger.info("Deal created: %s (ID: %s) by %s",
                deal.deal_name, deal.id, created_by.email)
    return deal


def list_deals(*,
    search: str = "",
    client_id: Optional[int] = None,
    status_id: Optional[int] = None):
    """
    Retrieve deals for list views, filtered and sorted newest first.

    Args:
        search (str): Matches against deal number and name, case-insensitive.
        client_id (Optional[int]): Restrict results to a single client.
        status_id (Optional[int]): Restrict results to a single status.

    Returns:
        QuerySet: Deals with client, status and author already joined.
    """
    qs = Deal.objects.select_related("client", "status", "created_by")
    if search:
        qs = qs.filter(
            Q(deal_number__icontains=search) | Q(deal_name__icontains=search)
        )
    if client_id:
        qs = qs.filter(client_id=client_id)
    if status_id:
        qs = qs.filter(status_id=status_id)
    return qs.order_by("-created_at")


def get_deal(deal_id: int) -> Deal:
    """
    Retrieve a deal by its ID.

    Args:
        deal_id (int): The ID of the deal to retrieve.

    Returns:
        Deal: The retrieved deal object.

    Raises:
        Deal.DoesNotExist: If no deal with the given ID exists.
    """
    return Deal.objects.get(id=deal_id)