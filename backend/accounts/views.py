import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

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
        "username": request.user.username,
        "email": request.user.email,
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

    from django.contrib.auth import get_user_model
    User = get_user_model()

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