import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from functools import wraps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.views.decorators.http import require_http_methods

User = get_user_model()

def admin_required(view_func):
    """
    Decorator to ensure that the user is authenticated and has administrator permissions.
    
    Args:
        view_func: The view function to be decorated.

    Returns:
        The decorated view function.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {"detail": "Authentication required."},
                status=401,
            )

        if not request.user.is_admin:
            return JsonResponse(
                {"detail": "Administrator permissions required."},
                status=403,
            )

        return view_func(request, *args, **kwargs)

    return wrapper


def parse_json_body(request):
    """
    Parse the JSON body of a request.
    
    Args:
        request: The HTTP request object.

    Returns:
        dict: The parsed JSON data or None if parsing fails.
    """
    try:
        data = json.loads(request.body)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def serialize_user(user):
    """
    Serialize a user object into a dictionary.

    Args:
        user: The user object to be serialized.

    Returns:
        dict: The serialized user data.
    """
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_admin": user.is_admin,
    }

@require_GET
@ensure_csrf_cookie

def current_user_view(request):
    """
    View to get the current authenticated user.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response containing the current user's information.
    """
    if not request.user.is_authenticated:
        return JsonResponse({
            "username": None,
            "is_authenticated": False,
        })

    return JsonResponse({
        "id": request.user.id,
        "username": request.user.username,
        "email": request.user.email,
        "full_name": request.user.full_name,
        "role": request.user.role,
        "is_admin": request.user.is_admin,
        "is_authenticated": True,
    })

@require_POST
def login_view(request):
    """
    View to log in a user.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response indicating the success or failure of the login attempt.
    """
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {"detail": "Invalid JSON."},
            status=400,
        )

    identifier = data.get("username", "")
    password = data.get("password", "")

    if not isinstance(identifier, str) or not isinstance(password, str):
        return JsonResponse(
            {"detail": "Invalid credentials."},
            status=400,
        )

    try:
        user_record = User.objects.get(username=identifier)
        email = user_record.email
    except User.DoesNotExist:
        email = identifier

    user = authenticate(request, username=email, password=password)

    if user is None:
        return JsonResponse(
            {"detail": "Invalid username or password."},
            status=401,
        )

    login(request, user)

    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_authenticated": True,
    })

@require_POST
def logout_view(request):
    """
    View to log out the current authenticated user.

    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response indicating the success of the logout operation.
    """
    logout(request)
    return JsonResponse({"detail": "Logged out successfully."})

@admin_required
@require_http_methods(["GET", "POST"])
def admin_users_view(request):
    """
    View to manage user accounts for administrators.
    
    Args:
        request: The HTTP request object.

    Returns:
        JsonResponse: A JSON response containing the list of user accounts or indicating the success of an operation.
    """

    # GET: Retrieve all accounts
    if request.method == "GET":
        users = User.objects.all().order_by("username")

        return JsonResponse(
            [serialize_user(user) for user in users],
            safe=False,
        )

    # POST: Create an account
    data = parse_json_body(request)

    if data is None:
        return JsonResponse({"detail": "Invalid JSON."}, status=400)

    username = data.get("username", "")
    email = data.get("email", "")
    password = data.get("password", "")
    role = data.get("role", "staff")
    full_name = data.get("full_name", "")

    if not all(isinstance(value, str) for value in (
        username, email, password, role, full_name
    )):
        return JsonResponse({"detail": "Invalid account fields."}, status=400)

    username = username.strip()
    email = email.strip()
    full_name = full_name.strip()

    if not username or not email or not password:
        return JsonResponse(
            {"detail": "Username, email, and password are required."},
            status=400,
        )

    if role not in User.Role.values:
        return JsonResponse({"detail": "Invalid role."}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"detail": "Username already exists."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"detail": "Email already exists."}, status=400)
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        full_name=full_name,
        role=role,
    )

    return JsonResponse(
        {
            "detail": "Account created successfully.",
            "user": serialize_user(user),
        },
        status=201,
    )

@require_http_methods(["DELETE"])
@admin_required
def admin_user_detail_view(request, user_id):
    """
    View to delete a user account for administrators.
    
    Args:
        request: The HTTP request object.
        user_id: The ID of the user account to be deleted.
        
    Returns:
        JsonResponse: A JSON response indicating the success or failure of the operation.
    """

    with transaction.atomic():
        try:
            user = User.objects.select_for_update().get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse(
                {"detail": "Account not found."},
                status=404,
            )

        if user.id == request.user.id:
            return JsonResponse(
                {"detail": "You cannot delete your own account."},
                status=400,
            )

        if user.is_superuser and not request.user.is_superuser:
            return JsonResponse(
                {"detail": "You cannot delete this account."},
                status=403,
            )

        if user.is_admin:
            admin_count = User.objects.filter(
                Q(is_superuser=True) | Q(role=User.Role.ADMIN)
            ).count()

            if admin_count <= 1:
                return JsonResponse(
                    {"detail": "Cannot delete the last administrator."},
                    status=400,
                )

        username = user.username
        user.delete()

    return JsonResponse({
        "detail": f"Account '{username}' deleted successfully."
    })