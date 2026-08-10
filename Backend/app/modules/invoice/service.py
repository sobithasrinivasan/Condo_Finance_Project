from datetime import datetime
from typing import Optional

from app.core.audit import ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException
from app.modules.extraction.repository import ExtractionRepository

from .model import DECISION_STATUSES, TABLE_NAME
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


def _with_document_url(row: dict) -> dict:
    attachment_path = row.get("attachment_path")
    if attachment_path and not row.get("document_url"):
        row["document_url"] = ExtractionRepository.normalize_document_url(attachment_path)
    return row


class InvoiceService:

    def __init__(self, db):
        self.db = db
        self.repo = InvoiceRepository(db)
        self.audit = AuditLogger(db)

    def get_invoice(self, invoice_id: int) -> dict:
        invoice = self.repo.get_by_id(invoice_id)
        if not invoice:
            raise InvoiceNotFoundException(invoice_id)
        return _with_document_url(_with_days_left(invoice))

    def list_invoices(self, filters: InvoiceFilters) -> tuple[list[dict], int]:
        rows, total = self.repo.get_filtered(filters)
        return [_with_document_url(_with_days_left(row)) for row in rows], total

    def update_invoice(self, invoice_id: int, payload: InvoiceUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(invoice_id, active_only=False)
        if not existing:
            raise InvoiceNotFoundException(invoice_id)

        data = payload.get_update_fields()

        if not data:
            return _with_days_left(existing)

        updated = self.repo.update_invoice(invoice_id, data, updated_by=updated_by)
        result = _with_document_url(_with_days_left(updated))
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=invoice_id,
            action=ACTION_UPDATE,
            old_values=existing,
            new_values=updated,
            acted_by=updated_by,
            invoice_id=invoice_id,
            vendor_id=updated.get("vendor_id") or existing.get("vendor_id"),
            document_extraction_id=updated.get("document_extraction_id") or existing.get("document_extraction_id"),
        )
        return result
