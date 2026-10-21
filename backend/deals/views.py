from django.shortcuts import render
from django.http import HttpRequest, JsonResponse
from core.models import Client, Status
from . import services


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
            "status": d.status.status_name,
            "target_date": d.target_date.isoformat() if d.target_date else None,
            "updated_at": d.updated_at.isoformat(),
        }
        for d in deals
    ]
    return JsonResponse({"count": len(results), "results": results})