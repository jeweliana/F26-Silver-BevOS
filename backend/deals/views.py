import json
from django.shortcuts import render
from django.http import HttpRequest, JsonResponse
from core.models import Client, Status
from . import services
from .models import *
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.core.exceptions import ValidationError

def _int(value: str | None) -> int | None:
    """
    Parse a querystring value into an int, or None if absent/invalid.

    Args:
        value (str | None): The querystring value to parse.

    Returns:
        int | None: The parsed integer or None if invalid.
    """
    try:
        return int(value) if value else None
    except (TypeError, ValueError):
        return None


def deal_list(request: HttpRequest) -> JsonResponse:
    """GET /api/deals/?search=&client_id=&status_id=

    Args:
        request: The incoming request; querystring drives filtering.

    Returns:
        JSON ``{"count": int, "results": [...]}``.
    """
    deals = services.list_deals(
        search=request.GET.get("search", "").strip(),
        client_id=_int(request.GET.get("client_id")),
        status_id=_int(request.GET.get("status_id")),
    )

    results = [
        {
            "id": d.pk,
            "deal_number": d.deal_number,
            "deal_name": d.deal_name,
            "client": d.client.client_name,
            "client_id": d.client_id,
            "status": d.status.status_name,
            "status_id": d.status_id,
            "target_date": d.target_date.isoformat() if d.target_date else None,
            "updated_at": d.updated_at.isoformat(),
        }
        for d in deals
    ]
    return JsonResponse({"count": len(results), "results": results})

def deal_detail(request: HttpRequest, deal_id: int) -> JsonResponse:
    """GET /api/deals/<id>/ - Retrieve a deal and all related information."""

    deal = get_object_or_404(
        Deal.objects.select_related(
            "client",
            "status",
            "created_by",
        ),
        pk=deal_id,
    )

    results = {
        # Basic deal information
        "id": deal.pk,
        "deal_number": deal.deal_number,
        "deal_name": deal.deal_name,
        "client": deal.client.client_name,
        "client_id": deal.client_id,
        "status": deal.status.status_name,
        "status_id": deal.status_id,
        "target_date": deal.target_date.isoformat() if deal.target_date else None,
        "created_by": deal.created_by.username if deal.created_by else None,
        "created_at": deal.created_at.isoformat(),
        "updated_at": deal.updated_at.isoformat(),
        "notes": deal.notes,

        # Packaging requirements
        "packaging_requirements": [
            {
                "id": item.pk,
                "item_type": item.item_type,
                "specification": item.specification,
                "quantity": item.quantity,
                "unit": item.unit,
                "uom": item.uom,
                "notes": item.notes,
            }
            for item in deal.packaging_requirements.all()
        ],

        # Specifications
        "specifications": [
            {
                "id": item.pk,
                "item_type": item.item_type,
                "spec_name": item.spec_name,
                "spec_value": item.spec_value,
                "unit": item.unit,
                "notes": item.notes,
            }
            for item in deal.specifications.all()
        ],

        # Customer quotes
        "customer_quotes": [
            {
                "id": item.pk,
                "quote_number": item.quote_number,
                "client": item.client.client_name,
                "quote_date": item.quote_date,
                "valid_until": item.valid_until,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.customer_quotes.select_related("client").all()
        ],

        # Customer purchase orders
        "customer_pos": [
            {
                "id": item.pk,
                "po_number": item.po_number,
                "client": item.client.client_name,
                "po_date": item.po_date,
                "expected_ship_date": item.expected_ship_date,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.customer_pos.select_related("client").all()
        ],

        # Customer invoices
        "customer_invoices": [
            {
                "id": item.pk,
                "invoice_number": item.invoice_number,
                "client": item.client.client_name,
                "invoice_date": item.invoice_date,
                "due_date": item.due_date,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.customer_invoices.select_related("client").all()
        ],

        # Supplier quotes
        "supplier_quotes": [
            {
                "id": item.pk,
                "quote_number": item.quote_number,
                "supplier": item.supplier.supplier_name,
                "quote_date": item.quote_date,
                "valid_until": item.valid_until,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.supplier_quotes.select_related("supplier").all()
        ],

        # Supplier purchase orders
        "supplier_pos": [
            {
                "id": item.pk,
                "po_number": item.po_number,
                "supplier": item.supplier.supplier_name,
                "po_date": item.po_date,
                "expected_delivery_date": item.expected_delivery_date,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.supplier_pos.select_related("supplier").all()
        ],

        # Supplier invoices
        "supplier_invoices": [
            {
                "id": item.pk,
                "invoice_number": item.invoice_number,
                "supplier": item.supplier.supplier_name,
                "invoice_date": item.invoice_date,
                "due_date": item.due_date,
                "total_amount": item.total_amount,
                "currency": item.currency,
                "status": item.status,
                "notes": item.notes,
            }
            for item in deal.supplier_invoices.select_related("supplier").all()
        ],

        # Documents
        "documents": [
            {
                "id": item.pk,
                "module_type": item.module_type,
                "module_id": item.module_id,
                "file_name": item.file_name,
                "file_path": item.file_path,
                "file_type": item.file_type,
                "file_size": item.file_size,
                "uploaded_by": item.uploaded_by.username if item.uploaded_by else None,
                "uploaded_at": item.uploaded_at.isoformat(),
                "description": item.description,
            }
            for item in deal.documents.select_related("uploaded_by").all()
        ],

        # Status history
        "status_history": [
            {
                "id": item.pk,
                "status": item.status.status_name,
                "changed_by": item.changed_by.username if item.changed_by else None,
                "changed_at": item.changed_at.isoformat(),
                "notes": item.notes,
            }
            for item in deal.status_history.select_related(
                "status", "changed_by"
            ).all()
        ],

        # Deal notes
        "deal_notes": [
            {
                "id": item.pk,
                "note_text": item.note_text,
                "created_by": item.created_by.username if item.created_by else None,
                "created_at": item.created_at.isoformat(),
            }
            for item in deal.deal_notes.select_related("created_by").all()
        ],

        # Deal activities
        "activities": [
            {
                "id": item.pk,
                "activity_type": item.activity_type,
                "description": item.description,
                "performed_by": item.performed_by.username if item.performed_by else None,
                "performed_at": item.performed_at.isoformat(),
            }
            for item in deal.activities.select_related("performed_by").all()
        ],
    }

    return JsonResponse(results)

def client_list(request: HttpRequest) -> JsonResponse:
    """GET /api/clients/"""

    clients = Client.objects.all().order_by("client_name")

    results = [
        {
            "id": client.pk,
            "client_name": client.client_name,
        }
        for client in clients
    ]

    return JsonResponse({"count": len(results), "results": results})


@require_http_methods(["PATCH"])
def deal_update(request: HttpRequest, deal_id: int) -> JsonResponse:
    try:
        data = json.loads(request.body)
        deal = Deal.objects.get(pk=deal_id)

        deal_name = data.get("deal_name")
        client_id = _int(data.get("client"))
        status_id = _int(data.get("status"))

        if not deal_name or not client_id or not status_id:
            return JsonResponse(
                {"detail": "Deal name, customer, and status are required."},
                status=400,
            )

        client = Client.objects.get(pk=client_id)
        status = Status.objects.get(pk=status_id)

        deal.deal_name = deal_name
        deal.client = client
        deal.status = status

        # Optional fields
        if "target_date" in data:
            deal.target_date = data["target_date"] or None

        if "notes" in data:
            deal.notes = data["notes"]

        deal.save()

        return JsonResponse({
            "message": "Deal updated successfully.",
            "id": deal.pk,
        })

    except Deal.DoesNotExist:
        return JsonResponse({"detail": "Deal not found."}, status=404)

    except (Client.DoesNotExist, Status.DoesNotExist):
        return JsonResponse(
            {"detail": "Selected customer or status does not exist."},
            status=400,
        )

    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    except (ValueError, TypeError):
        return JsonResponse(
            {"detail": "Invalid date or field value."},
            status=400,
        )


def status_list(request: HttpRequest) -> JsonResponse:
    statuses = Status.objects.filter(
        category="deal",
        is_active=True
    ).order_by("sort_order")

    results = [
        {
            "id": status.pk,
            "status_name": status.status_name,
        }
        for status in statuses
    ]

    return JsonResponse({"count": len(results), "results": results})

# Customer purchase orders associated with a deal.
ORDER_STATUSES = ("Draft", "Open", "In Progress", "Completed", "Cancelled")


@login_required
@require_http_methods(["POST"])
def customer_po_create(request: HttpRequest, deal_id: int) -> JsonResponse:
    deal = get_object_or_404(Deal, pk=deal_id)

    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"detail": "Expected an order object."}, status=400)

    po_number = str(data.get("po_number") or "").strip()
    status = str(data.get("status") or "Draft").strip()

    if not po_number:
        return JsonResponse({"detail": "PO number is required."}, status=400)

    if status not in ORDER_STATUSES:
        return JsonResponse({"detail": "Please choose a valid order status."}, status=400)

    order = CustomerPO(
        deal=deal,
        client=deal.client,
        po_number=po_number,
        po_date=data.get("po_date") or None,
        expected_ship_date=data.get("expected_ship_date") or None,
        total_amount=data.get("total_amount") if data.get("total_amount") not in (None, "") else None,
        currency="USD",
        status=status,
        notes=str(data.get("notes") or ""),
    )

    try:
        order.full_clean()
        order.save()
    except ValidationError as error:
        return JsonResponse({"detail": "; ".join(error.messages)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "This PO number is already in use."}, status=400)

    return JsonResponse({"message": "Order created.", "id": order.pk}, status=201)


@login_required
@require_http_methods(["PATCH"])
def customer_po_update(request: HttpRequest, deal_id: int, po_id: int) -> JsonResponse:
    order = get_object_or_404(CustomerPO, pk=po_id, deal_id=deal_id)

    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    if not isinstance(data, dict) or "status" not in data:
        return JsonResponse({"detail": "An order status is required."}, status=400)

    status = str(data["status"]).strip()

    if status not in ORDER_STATUSES:
        return JsonResponse({"detail": "Please choose a valid order status."}, status=400)

    order.status = status
    order.save(update_fields=["status", "updated_at"])

    return JsonResponse({
        "message": "Order status updated.",
        "id": order.pk,
        "status": order.status
    })

# Create a new customer
@login_required
@require_http_methods(["POST"])
def client_create(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid customer information."}, status=400)

    name = str(data.get("client_name") or "").strip()

    if not name:
        return JsonResponse({"detail": "Customer name is required."}, status=400)

    customer = Client(
        client_name=name,
        contact_name=str(data.get("contact_name") or "").strip(),
        email=str(data.get("email") or "").strip(),
        phone=str(data.get("phone") or "").strip(),
        address=str(data.get("address") or "").strip(),
        notes=str(data.get("notes") or "").strip(),
    )

    try:
        customer.full_clean()
        customer.save()
    except ValidationError as error:
        return JsonResponse({"detail": "; ".join(error.messages)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "Customer already exists."}, status=400)

    return JsonResponse({
        "message": "Customer created successfully.",
        "id": customer.id,
        "client_name": customer.client_name
    }, status=201)


# Create a new deal for an existing customer
@login_required
@require_http_methods(["POST"])
def deal_create(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"detail": "Invalid deal information."}, status=400)

    deal_number = str(data.get("deal_number") or "").strip()
    deal_name = str(data.get("deal_name") or "").strip()

    if not deal_number or not deal_name:
        return JsonResponse({
            "detail": "Deal number and deal name are required."
        }, status=400)

    try:
        client = Client.objects.get(pk=data.get("client"))
        status = Status.objects.get(
            pk=data.get("status"),
            category="deal",
            is_active=True
        )
    except (Client.DoesNotExist, Status.DoesNotExist, ValueError, TypeError):
        return JsonResponse({
            "detail": "Please select a valid customer and status."
        }, status=400)

    deal = Deal(
        deal_number=deal_number,
        deal_name=deal_name,
        client=client,
        status=status,
        target_date=data.get("target_date") or None,
        notes=str(data.get("notes") or ""),
        created_by=request.user
    )

    try:
        deal.full_clean()
        deal.save()
    except ValidationError as error:
        return JsonResponse({"detail": "; ".join(error.messages)}, status=400)
    except IntegrityError:
        return JsonResponse({"detail": "Deal number already exists."}, status=400)

    return JsonResponse({
        "message": "Deal created successfully.",
        "id": deal.id,
        "deal_number": deal.deal_number
    }, status=201)
