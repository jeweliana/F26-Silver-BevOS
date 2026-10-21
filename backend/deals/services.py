# Handle create_deal(), process_deal(), etc.
from deals.models import Deal

def create_deal(*,
    client: Client,
    status: Status,
    created_by: User,
    deal_name: str,
    deal_number: Optional[str] = None,
    target_date: Optional[datetime] = None,
    notes: str = "",
    initial_status_note: str = "Deal created",) -> Deal:
    """
    Create a new deal with the provided information.

    Args:
        client (Client): The client associated with the deal.
        status (Status): The initial status of the deal.
        created_by (User): The user creating the deal.
        deal_name (str): The name of the deal.
        deal_number (Optional[str]): An optional deal number.
        target_date (Optional[datetime]): An optional target date for the deal.
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
        deal_number=deal_number,
        target_date=target_date,
        notes=notes,
        initial_status_note=initial_status_note
    )
    StatusHistory.objects.create(
        deal=deal,
        status=status,
        changed_by=created_by,
        note=initial_status_note
    )
    logging.info(f"Deal created: {deal.deal_name} (ID: {deal.id}) by {created_by.email}")
    return deal

def get_deal(deal_id: int):
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