from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from .models import ApprovalRequest


@login_required
def approval_list(request):
    if request.method != "GET":
        return JsonResponse(
            {"error": "Method not allowed"},
            status=405,
        )

    approvals = ApprovalRequest.objects.select_related(
        "deal",
        "requested_by",
        "assigned_to",
    ).order_by("-created_at")

    data = [
        {
            "id": approval.id,
            "deal_id": approval.deal_id,
            "deal_number": approval.deal_number,
            "title": approval.title,
            "approval_type": approval.approval_type,
            "status": approval.status,
            "requested_by": approval.requested_by.id,
            "assigned_to": approval.assigned_to_id,
            "created_at": approval.created_at.isoformat(),
            "reviewed_at": (
                approval.reviewed_at.isoformat()
                if approval.reviewed_at
                else None
            ),
        }
        for approval in approvals
    ]

    return JsonResponse({"approvals": data})