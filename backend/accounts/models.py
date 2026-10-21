from django.contrib.auth.models import AbstractUser
from django.db import models


class Organization(models.Model):
    """A company Nice Package Co works with, or Nice Package Co itself."""

    class OrganizationType(models.TextChoices):
        BRAND = "BRAND", "Brand"
        MANUFACTURER = "MANUFACTURER", "Manufacturer"
        PACKAGER = "PACKAGER", "Packager"
        DISTRIBUTOR = "DISTRIBUTOR", "Distributor"

    name = models.CharField(max_length=200, unique=True)
    organization_type = models.CharField(
        max_length=20,
        choices=OrganizationType.choices,
        default=OrganizationType.BRAND,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractUser):
    """App users. Email is the login handle; role drives in-app permissions."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MANAGER = "manager", "Manager"
        STAFF = "staff", "Staff"

    email = models.EmailField("email address", unique=True)
    full_name = models.CharField(max_length=200, blank=True, default="")
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.STAFF, blank=True,
    )
    organization = models.ForeignKey(
        Organization, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="members",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.full_name or self.username

    @property
    def is_admin(self):
        return self.is_superuser or self.role == self.Role.ADMIN
