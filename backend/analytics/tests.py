from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from core.models import Client, Status
from deals.models import CustomerInvoice, CustomerQuote, Deal
from . import services

class SummaryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        client = Client.objects.create(client_name="Test Client")
        draft = Status.objects.create(status_name="Draft", category="deal", sort_order=1)
        done = Status.objects.create(status_name="Completed", category="deal", sort_order=3)
        
        cls.open_deal = Deal.objects.create(
            deal_number="T-1", deal_name="Open", client=client, status=draft, target_date=date(2026, 11, 1),
        )
        Deal.objects.create(
            deal_number="T-2", deal_name="Done", client=client, status=done, target_date=date(2026, 11, 1),
        )
        CustomerQuote.objects.create(
            deal=cls.open_deal, client=client, quote_number="Q-1", total_amount=Decimal("100.00"), status="Quote Sent",
        )
        CustomerInvoice.objects.create(
            deal=cls.open_deal, client=client, invoice_number="I-1", total_amount=Decimal("50.00"), status="Customer Invoice Paid",
        )
        
    def test_summary_counts(self):
        data = services.summary(today=date(2026, 10, 22))
        self.assertEqual(data["total_deals"], 2)
        self.assertEqual(data["deals_by_status"], {"Draft": 1, "Completed": 1})
        # Completed deals are excluded when their target date is close.
        self.assertEqual(data["deals_due_soon"], 1)
        self.assertEqual(data["open_quote_value"], Decimal("100.00"))
        # Paid invoices don't count; nothing is outstanding.
        self.assertEqual(data["receivables_outstanding"], Decimal("0"))
        
    def test_endpoint_returns_json(self):
        response = self.client.get(reverse("analytics:summary"))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["deals_by_status"], {"Draft": 1, "Completed": 1})
        self.assertEqual(body["open_quote_value"], 100.0)
        
    def test_endpoint_rejects_post(self):
        response = self.client.post(reverse("analytics:summary"))
        self.assertEqual(response.status_code, 405)