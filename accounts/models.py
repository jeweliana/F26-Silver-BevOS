from django.db import models
from django.contrib.auth.models import AbstractUser

class Organization(models.Model):
    
    class OrganizationType(models.TextChoices):
        BRAND = 'BRAND', 'Brand'
        MANUFACTURER = 'MANUFACTURER', 'Manufacturer'
        PACKAGER = 'PACKAGER', 'Packager'
        DISTRIBUTOR = 'DISTRIBUTOR', 'Distributor'
        
    name = models.CharField(max_length=200)
    
    organization_type = models.CharField(
        max_length=20,
        choices=OrganizationType.choices,
        default=OrganizationType.BRAND,
    )
    
    def __str__(self):
        return self.name

class User(AbstractUser):
    # Defining custom User model since this design decision needs to be made early.
    pass
