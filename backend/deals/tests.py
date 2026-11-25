import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from core.models import Client, Status
from .models import Deal, PackagingRequirement


class PackagingRequirementCreateTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="packaging-tester")
        customer = Client.objects.create(client_name="Test Customer")
        status = Status.objects.create(status_name="Draft", category="deal")
        self.deal = Deal.objects.create(
            deal_number="TEST-1", deal_name="Test Deal", client=customer, status=status
        )
        self.other = Deal.objects.create(
            deal_number="TEST-2", deal_name="Other Deal", client=customer, status=status
        )
        self.url = reverse("deals:packaging-requirement-create", args=[self.deal.pk])
        self.client.force_login(self.user)

    def post(self, data, url=None):
        return self.client.post(url or self.url, json.dumps(data), content_type="application/json")

    def test_saves_all_fields_to_selected_deal(self):
        response = self.post({
            "item_type": "carton", "quantity": "12.125", "unit": "each",
            "uom": "cases", "specification": "Double wall", "notes": "Local test",
        })
        self.assertEqual(response.status_code, 201)
        record = PackagingRequirement.objects.get(pk=response.json()["id"])
        self.assertEqual(record.deal_id, self.deal.pk)
        self.assertEqual(record.quantity, Decimal("12.125"))
        self.assertEqual((record.unit, record.uom, record.specification, record.notes),
                         ("each", "cases", "Double wall", "Local test"))
        self.assertFalse(self.other.packaging_requirements.exists())
        detail = self.client.get(reverse("deals:deal-detail", args=[self.deal.pk])).json()
        self.assertEqual(detail["packaging_requirements"][0]["id"], record.pk)

    def test_optional_fields_and_zero_quantity(self):
        for quantity in ("", "0"):
            with self.subTest(quantity=quantity):
                self.assertEqual(self.post({"item_type": "can", "quantity": quantity}).status_code, 201)

    def test_rejects_invalid_input_without_saving(self):
        cases = [None, [], {"item_type": ""}, {"item_type": "bottle"}]
        cases += [{"item_type": "tray", "quantity": value}
                  for value in ("-1", "NaN", "Infinity", "abc", "1.0001", "100000000000")]
        cases += [{"item_type": "end", "unit": "x" * 51}]
        for data in cases:
            with self.subTest(data=data):
                self.assertEqual(self.post(data).status_code, 400)
                self.assertFalse(PackagingRequirement.objects.exists())

    def test_missing_deal_and_malformed_json(self):
        missing = reverse("deals:packaging-requirement-create", args=[999999])
        self.assertEqual(self.post({"item_type": "can"}, missing).status_code, 404)
        self.assertEqual(self.client.post(self.url, "{", content_type="application/json").status_code, 400)

    def test_requires_login_and_post(self):
        self.assertEqual(self.client.get(self.url).status_code, 405)
        self.client.logout()
        self.assertEqual(self.post({"item_type": "can"}).status_code, 302)
        self.assertFalse(PackagingRequirement.objects.exists())
