from datetime import datetime
from typing import Optional

from app.core.exceptions import AppException

from .model import DECISION_STATUSES
from .repository import InvoiceRepository
from .schema import InvoiceFilters, InvoiceUpdate


class InvoiceNotFoundException(AppException):

    def __init__(self, invoice_id: int):
        super().__init__(
            status_code=404,
            message=f"Invoice with id {invoice_id} not found."
        )


def _with_days_left(row: dict) -> dict:
    due_date = row.get("due_date")
    invoice_date = row.get("invoice_date")
    row["days_left"] = (due_date - invoice_date).days if due_date and invoice_date else None
    return row


class InvoiceService:

    def __init__(self, db):
        self.db = db
        self.repo = InvoiceRepository(db)

    def get_invoice(self, invoice_id: int) -> dict:
        invoice = self.repo.get_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundException(invoice_id)
        return _with_days_left(invoice)

    def list_invoices(self, filters: InvoiceFilters) -> tuple[list[dict], int]:
        rows, total = self.repo.get_filtered(filters)
        return [_with_days_left(row) for row in rows], total

    def update_invoice(self, invoice_id: int, payload: InvoiceUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(invoice_id, active_only=False)
        if not existing:
            raise InvoiceNotFoundException(invoice_id)

        data = payload.get_update_fields()

        new_status = data.get("status")
        if new_status and new_status != existing["status"]:
            if new_status in DECISION_STATUSES:
                data["approved_by"] = updated_by
                data["approved_at"] = datetime.utcnow()
            if new_status == "Paid":
                data["paid_at"] = datetime.utcnow()

        if not data:
            return _with_days_left(existing)

        updated = self.repo.update_invoice(invoice_id, data, updated_by=updated_by)
        return _with_days_left(updated)
