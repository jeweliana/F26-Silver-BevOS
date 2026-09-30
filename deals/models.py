from django.db import models

class Deal(models.Model):
    title = models.CharField(max_length=200)
    client = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    def __str__(self):
        return self.title

# Create your models here.
