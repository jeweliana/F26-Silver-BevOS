# This script seeds the database with demo data for testing.

from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from core.models import Client, Status, Supplier
from deals.models import (
    CustomerInvoice, CustomerPO, CustomerQuote, Deal, DealActivity, DealNote,
    Document, NicePackagePO, PackagingRequirement, Specification, StatusHistory,
    SupplierInvoice, SupplierQuote,
)

USERS = [
    ("alex.morgan", "Alex Morgan", "alex.morgan@example.test", "admin"),
    ("jordan.lee", "Jordan Lee", "jordan.lee@example.test", "manager"),
    ("taylor.reed", "Taylor Reed", "taylor.reed@example.test", "staff"),
]

CLIENTS = [
    ("Harbor Foods", "Morgan Price", "m.price@harborfoods.example.test", "757-555-0101",
     "100 Harbor Way, Norfolk, VA", "Net 30"),
    ("Greenfield Beverage", "Casey Brooks", "c.brooks@greenfield.example.test", "757-555-0102",
     "25 Orchard Road, Chesapeake, VA", "Net 45"),
    ("Summit Nutrition", "Riley Chen", "r.chen@summitnutrition.example.test", "757-555-0103",
     "8 Summit Park, Virginia Beach, VA", "Net 30"),
]

SUPPLIERS = [
    ("Atlantic Carton Works", "Jamie Cole", "jamie@atlanticcarton.example.test",
     "804-555-0201", "14 Mill Road, Richmond, VA", "Net 30"),
    ("Blue Ridge Plastics", "Avery Scott", "avery@blueridgeplastics.example.test",
     "540-555-0202", "70 Industrial Drive, Roanoke, VA", "Net 30"),
    ("Commonwealth Can Co.", "Drew Patel", "drew@commonwealthcan.example.test",
     "703-555-0203", "9 Foundry Lane, Alexandria, VA", "Net 45"),
]

CATEGORIES = {
    "deal": ["Draft", "In Progress", "Completed"],
    "customer_quote": ["Quote Draft", "Quote Sent", "Quote Accepted"],
    "customer_po": ["Customer PO Open", "Customer PO Confirmed", "Customer PO Fulfilled"],
    "customer_invoice": ["Customer Invoice Draft", "Customer Invoice Issued",
                         "Customer Invoice Paid"],
    "supplier_po": ["Supplier PO Requested", "Supplier PO Ordered", "Supplier PO Received"],
    "supplier_invoice": ["Supplier Invoice Received", "Supplier Invoice Approved",
                         "Supplier Invoice Paid"],
}

DEALS = [
    ("NPC-2026-001", "Harbor Foods Carton Refresh", 0, "In Progress", date(2026, 11, 20),
     "carton", "Double-wall corrugated shipping carton", 12000,
     "Outside dimensions", "400 x 300 x 250", "mm",
     "CQ-2026-001", Decimal("18600.00"), "Quote Sent",
     "HF-PO-4401", "Customer PO Confirmed",
     "CI-2026-001", "Customer Invoice Issued",
     "ACW-Q-6101", Decimal("11200.00"), "Quote Accepted",
     "NPC-PO-2026-001", "Supplier PO Ordered", date(2026, 11, 10),
     "SI-ACW-3001", "Supplier Invoice Approved",
     "harbor-carton-spec.pdf"),
    ("NPC-2026-002", "Greenfield Beverage Tray Program", 1, "Draft", date(2026, 12, 5),
     "tray", "Six-pack beverage carrier tray", 8000,
     "Pack configuration", "6 x 330 mL bottles", "",
     "CQ-2026-002", Decimal("9200.00"), "Quote Accepted",
     "GB-PO-7712", "Customer PO Open",
     "CI-2026-002", "Customer Invoice Draft",
     "BRP-Q-6102", Decimal("5400.00"), "Quote Sent",
     "NPC-PO-2026-002", "Supplier PO Requested", date(2026, 11, 28),
     "SI-BRP-3002", "Supplier Invoice Received",
     "greenfield-quote.pdf"),
    ("NPC-2026-003", "Summit Nutrition Can Packaging", 2, "Completed", date(2026, 10, 30),
     "can", "Printed metal can with easy-open end", 15000,
     "Nominal capacity", "400", "mL",
     "CQ-2026-003", Decimal("12750.00"), "Quote Draft",
     "SN-PO-1198", "Customer PO Fulfilled",
     "CI-2026-003", "Customer Invoice Paid",
     "CCC-Q-6103", Decimal("8100.00"), "Quote Draft",
     "NPC-PO-2026-003", "Supplier PO Received", date(2026, 10, 25),
     "SI-CCC-3003", "Supplier Invoice Paid",
     "commonwealth-invoice.pdf"),
]


class Command(BaseCommand):
    help = "Load Phase 1 demo data (idempotent)."

    def handle(self, *args, **opts):
        User = get_user_model()
        users = []
        for username, full_name, email, role in USERS:
            user, made = User.objects.get_or_create(
                username=username,
                defaults={"email": email, "is_staff": role == "admin",
                          "is_superuser": role == "admin"},
            )
            user.set_password(f"{username}-demo-123")
            user.save()
            users.append(user)
            if made:
                self.stdout.write(f"user {username} ({role})")

        for name, contact, email, phone, address, terms in CLIENTS:
            Client.objects.get_or_create(
                client_name=name,
                defaults={"contact_name": contact, "email": email, "phone": phone,
                          "address": address, "payment_terms": terms},
            )
        for name, contact, email, phone, address, terms in SUPPLIERS:
            Supplier.objects.get_or_create(
                supplier_name=name,
                defaults={"contact_name": contact, "email": email, "phone": phone,
                          "address": address, "payment_terms": terms},
            )

        statuses = {}
        for category, names in CATEGORIES.items():
            for order, label in enumerate(names, start=1):
                obj, _ = Status.objects.get_or_create(
                    status_name=label,
                    defaults={"category": category, "sort_order": order},
                )
                statuses[label] = obj

        clients = list(Client.objects.all())
        suppliers = list(Supplier.objects.all())

        for row in DEALS:
            (number, title, ci, status_label, target, item_type, spec_text, qty,
             spec_name, spec_value, unit, cqn, amount, cq_status, pol, po_status,
             cin, ci_status, sqn, sq_amount, sq_status, npn, np_status, ship,
             sin, si_status, filename) = row
            client, supplier = clients[ci], suppliers[ci]
            deal, _ = Deal.objects.get_or_create(
                deal_number=number,
                defaults={"deal_name": title, "client": client,
                          "status": statuses[status_label], "target_date": target,
                          "created_by": users[ci]},
            )
            PackagingRequirement.objects.get_or_create(
                deal=deal, item_type=item_type,
                defaults={"specification": spec_text, "quantity": Decimal(qty),
                          "unit": "each", "uom": "each"},
            )
            Specification.objects.get_or_create(
                deal=deal, spec_name=spec_name,
                defaults={"item_type": item_type, "spec_value": spec_value, "unit": unit},
            )
            CustomerQuote.objects.get_or_create(
                quote_number=cqn,
                defaults={"deal": deal, "client": client, "quote_date": date(2026, 10, 1),
                          "valid_until": date(2026, 11, 1), "total_amount": amount,
                          "status": cq_status},
            )
            CustomerPO.objects.get_or_create(
                po_number=pol,
                defaults={"deal": deal, "client": client, "po_date": date(2026, 10, 6),
                          "expected_ship_date": target, "total_amount": amount,
                          "status": po_status},
            )
            CustomerInvoice.objects.get_or_create(
                invoice_number=cin,
                defaults={"deal": deal, "client": client, "invoice_date": date(2026, 10, 10),
                          "due_date": date(2026, 11, 9), "total_amount": amount,
                          "status": ci_status},
            )
            SupplierQuote.objects.get_or_create(
                supplier=supplier, quote_number=sqn,
                defaults={"deal": deal, "quote_date": date(2026, 9, 25),
                          "valid_until": date(2026, 10, 25), "total_amount": sq_amount,
                          "status": sq_status},
            )
            NicePackagePO.objects.get_or_create(
                po_number=npn,
                defaults={"deal": deal, "supplier": supplier,
                          "po_date": date(2026, 10, 2), "expected_delivery_date": ship,
                          "total_amount": sq_amount, "status": np_status},
            )
            SupplierInvoice.objects.get_or_create(
                supplier=supplier, invoice_number=sin,
                defaults={"deal": deal, "invoice_date": date(2026, 10, 10),
                          "due_date": date(2026, 11, 9), "total_amount": sq_amount,
                          "status": si_status},
            )
            Document.objects.get_or_create(
                deal=deal, file_name=filename,
                defaults={"module_type": "deal", "module_id": deal.pk,
                          "file_path": f"/documents/deals/{number}/{filename}",
                          "file_type": "application/pdf", "file_size": 245760,
                          "uploaded_by": users[ci]},
            )
            StatusHistory.objects.get_or_create(
                deal=deal, status=statuses[status_label],
                defaults={"changed_by": users[ci], "notes": f"Set to {status_label}"},
            )
            DealNote.objects.get_or_create(
                deal=deal, note_text=f"Demo note for {title}.",
                defaults={"created_by": users[ci]},
            )
            DealActivity.objects.get_or_create(
                deal=deal, activity_type="Client Contact",
                defaults={"description": f"Kickoff contact for {title}.",
                          "performed_by": users[ci]},
            )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Deal.objects.count()} deals, {Client.objects.count()} clients, "
            f"{Supplier.objects.count()} suppliers, {Status.objects.count()} statuses."
        ))