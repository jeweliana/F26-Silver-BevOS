import json
from django.shortcuts import render
from django.http import HttpRequest, JsonResponse
from core.models import Client, Status
from . import services
from .models import Deal
from django.views.decorators.http import require_http_methods

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