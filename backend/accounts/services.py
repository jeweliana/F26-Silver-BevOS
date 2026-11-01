from __future__ import annotations
from django.db import transaction
from django.db.models import Q, QuerySet
from django.core import validators
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from accounts.models import Organization, User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate, get_user_model
from .models import User, Organization
import logging
from typing import Optional, Iterable

logger = logging.getLogger(__name__)

ADMIN_ROLE = User.Role.ADMIN

@transaction.atomic
def create_user(
    *,
    email: str,
    password: str,
    full_name: str = "",
    role: str = User.Role.STAFF,
    organization: Optional[Organization] = None,
    actor: Optional[User] = None,
) -> User:
    """
    Create a new user with the provided information.

    Args:
        email (str): The email address of the new user.
        password (str): The password for the new user.
        full_name (str): The full name of the new user.
        role (str): The role of the new user.
        organization (Optional[Organization]): The organization to which the new user belongs.
        actor (Optional[User]): The user performing the creation action.

    Returns:
        User: The created user instance.

    Raises:
        DuplicateUserError: If a user with the provided email already exists.
        PermissionDenied: If the actor does not have permission to create a user.
        ValidationError: If the provided data is invalid.
    """
    email = email.strip().lower()

    if User.objects.filter(email=email).exists():
        raise DuplicateUserError(f"A user with email {email} already exists.")

    if role == ADMIN_ROLE and (actor is None or not actor.is_admin):
        raise PermissionDenied("Only admins can create users with the admin role.")

    user = User(
        email=email,
        full_name=full_name,
        role=role,
        organization=organization,
        is_staff=role == User.Role.ADMIN,
    )

    if password is None:
        user.set_password(password)
    else:
        validators.validate_password(password, user)
        user.set_password(password)
    user.save()

    logger.info(f"User created: {user.email} (ID: {user.id}) by {actor.email if actor else 'system'}")

    return user

def get_user(user_id: int) -> User:
    """
    Retrieve a user by their ID.

    Args:
        user_id (int): The ID of the user to retrieve.

    Returns:
        User: The user instance corresponding to the provided ID.

    Raises:
        User.DoesNotExist: If no user with the given ID exists.
    """
    return User.objects.get(id=user_id)

def get_user_by_email(email: str) -> User:
    """
    Retrieve a user by their email address.

    Args:
        email (str): The email address of the user to retrieve.

    Returns:
        User: The user instance corresponding to the provided email address.

    Raises:
        User.DoesNotExist: If no user with the given email address exists.
    """
    return User.objects.get(email=email)

def list_users(
    *,
    search: str = "",
    role: Optional[str] = None,
    organization_id: Optional[int] = None,
    include_inactive: bool = False,
) -> QuerySet[User]:
    """
    List users based on the provided criteria.

    Args:
        search (str): A search term to filter users.
        role (Optional[str]): The role to filter users by.
        organization_id (Optional[int]): The organization ID to filter users by.
        include_inactive (bool): Whether to include inactive users.

    Returns:
        QuerySet[User]: The filtered list of users.
    """
    users = User.objects.all()
    if search:
        users = users.filter(
            Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(email__icontains=search)
        )
    if role:
        users = users.filter(role=role)
    if organization_id:
        users = users.filter(organization_id=organization_id)
    if not include_inactive:
        users = users.filter(is_active=True)
    return users

def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate a user based on their email and password.

    Args:
        email (str): The email address of the user.
        password (str): The password of the user.

    Returns:
        Optional[User]: The authenticated user instance if credentials are valid; otherwise, None.
    """
    try:
        user = User.objects.get(email=email)
        if user.check_password(password):
            return user
    except User.DoesNotExist:
        return None

@transaction.atomic
def reset_password(
    user: User,
    *,
    new_password: str,
    actor: Optional[User] = None,
) -> User:
    """
    Reset the password for a user.

    Args:
        user (User): The user whose password is to be reset.
        new_password (str): The new password for the user.
        actor (Optional[User]): The user performing the password reset action.

    Returns:
        User: The updated user instance with the new password.

    Raises:
        ValidationError: If the new password does not meet validation criteria.
    """
    validators.validate_password(new_password, user)
    user.set_password(new_password)
    user.save()

    logger.info(f"Password reset for user: {user.email} (ID: {user.id}) by {actor.email if actor else 'system'}")

    return user

@transaction.atomic
def delete_user(
    user: User,
    *,
    actor: Optional[User] = None,
) -> None:
    """
    Delete a user from the system.

    Args:
        user (User): The user to be deleted.
        actor (Optional[User]): The user performing the deletion action.

    Raises:
        PermissionDenied: If the actor does not have permission to delete the user.
    """
    if actor and not actor.is_admin:
        raise PermissionDenied("Only admins can delete users.")

    logger.info(f"User deleted: {user.email} (ID: {user.id}) by {actor.email if actor else 'system'}")
    user.delete()