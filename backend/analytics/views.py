from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from . import services

MONEY_KEYS = ("open_quote_value", "receivables_outstanding", "payables_outstanding")

@require_GET
def summary(request: HttpRequest) -> JsonResponse:
    """
    GET /api/analytics/summary/

    Args:
        request (HttpRequest): The incoming request.

    Returns:
        JsonResponse: The service summary, with money totals as numbers
        so the frontend can format them as currency.
    """
    data = services.summary()
    for key in MONEY_KEYS:
        data[key] = float(data[key])

    return JsonResponse(data)