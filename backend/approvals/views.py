import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.http import JsonResponse

from deals.models import Deal
from .models import ApprovalRequest


@login_required
def approval_list(request):
    # Only allow GET and POST requests for this endpoint.
    if request.method not in ("GET", "POST"):
        return JsonResponse(
            {"error": "Method not allowed"},
            status=405,
        )

    # POST: Create a new approval request.
    if request.method == "POST":

        # Convert the incoming JSON request body into a Python dictionary.
        # Return an error if the JSON is malformed.
        try:
            data = json.loads(request.body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse(
                {"error": "Invalid JSON"},
                status=400,
            )

        # Ensure the submitted JSON contains an object.
        if not isinstance(data, dict):
            return JsonResponse(
                {"error": "Expected a JSON object"},
                status=400,
            )

        # Extract the approval information submitted by the user.
        deal_id = data.get("deal_id")
        reviewer_id = data.get("assigned_to")
        title = data.get("title")
        description = data.get("description", "")
        approval_type = data.get("approval_type")

        # Validate the approval details before saving anything.
        # The title is required, and the approval type must be supported.
        if (
            not isinstance(title, str)
            or not title.strip()
            or len(title.strip()) > 255
            or not isinstance(description, str)
            or approval_type not in ApprovalRequest.ApprovalType.values
        ):
            return JsonResponse(
                {"error": "Invalid approval details"},
                status=400,
            )

        # Verify that the selected deal exists and the assigned
        # reviewer is an active BevOS user.
        try:
            deal = Deal.objects.get(pk=deal_id)
            reviewer = get_user_model().objects.get(
                pk=reviewer_id,
                is_active=True,
            )
        except (
            Deal.DoesNotExist,
            get_user_model().DoesNotExist,
            ValueError,
            TypeError,
        ):
            return JsonResponse(
                {"error": "Invalid deal or reviewer ID"},
                status=404,
            )

        # Create the approval request in the database.
        # The logged-in user becomes the requester automatically.
        # New approvals start with a "pending" status.
        approval = ApprovalRequest.objects.create(
            deal=deal,
            approval_type=approval_type,
            title=title.strip(),
            description=description,
            requested_by=request.user,
            assigned_to=reviewer,
        )

        # Return the new approval ID and status to the frontend.
        # HTTP 201 indicates that a new record was created.
        return JsonResponse(
            {
                "id": approval.id,
                "status": approval.status,
                "message": "Approval request created",
            },
            status=201,
        )

    # GET: Retrieve existing approval requests.
    # Include related deal and user information efficiently.
    approvals = ApprovalRequest.objects.select_related(
        "deal",
        "requested_by",
        "assigned_to",
    ).order_by("-created_at")

    # Administrators can view all approvals.
    # Other users can only view approvals they requested
    # or approvals assigned to them for review.
    if not request.user.is_admin:
        approvals = approvals.filter(
            Q(requested_by=request.user)
            | Q(assigned_to=request.user)
        )

    # Convert each approval into JSON-compatible data.
    data = [
        {
            "id": approval.id,
            "deal_id": approval.deal_id,
            "deal_number": approval.deal.deal_number,
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

    # Return the approvals the current user is allowed to view.
    return JsonResponse({"approvals": data})