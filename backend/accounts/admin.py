from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Organization

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # Add any customizations to the UserAdmin here if needed
    pass

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization_type')
    list_filter = ('organization_type',)
    search_fields = ('name',)

# Register your models here.
