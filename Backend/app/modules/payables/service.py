from datetime import date
from typing import Any, Optional

from app.core.audit import ACTION_CREATE, ACTION_SOFT_DELETE, ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException

from .model import TABLE_NAME
from .repository import PayableRepository
from .schema import PayableCreate, PayableFilters, PayableUpdate


class PayableNotFoundException(AppException):

    def __init__(self, payable_id: int):
        super().__init__(
            status_code=404,
            message=f"Payable with id {payable_id} not found."
        )


class PayableService:

    def __init__(self, db):
        self.db = db
        self.repo = PayableRepository(db)
        self.audit = AuditLogger(db)

    def create_payable(self, payload: PayableCreate, created_by: Optional[int] = None) -> dict:
        data = payload.model_dump(exclude_none=True)
        payable_id = self.repo.create(data)
        new_values = self.repo.get_by_id(payable_id)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=payable_id,
            action=ACTION_CREATE,
            new_values=new_values,
            acted_by=created_by or data.get("created_by"),
            payable_id=payable_id,
            vendor_id=data.get("vendor_id"),
            document_extraction_id=data.get("document_extraction_id"),
        )
        return new_values

    def get_payable(self, payable_id: int) -> dict:
        payable = self.repo.get_by_id(payable_id)
        if not payable:
            raise PayableNotFoundException(payable_id)
        return payable

    def list_payables(self, filters: PayableFilters) -> tuple[list[dict], int]:
        return self.repo.get_filtered(filters)

    def update_payable(self, payable_id: int, payload: PayableUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(payable_id, active_only=False)
        if not existing:
            raise PayableNotFoundException(payable_id)

        data = payload.get_update_fields()

        if not data:
            return self.repo.get_by_id(payable_id, active_only=False)

        updated = self.repo.update(payable_id, data, updated_by=updated_by)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=payable_id,
            action=ACTION_UPDATE,
            old_values=existing,
            new_values=updated,
            acted_by=updated_by,
            payable_id=payable_id,
            vendor_id=updated.get("vendor_id") or existing.get("vendor_id"),
            document_extraction_id=updated.get("document_extraction_id") or existing.get("document_extraction_id"),
        )
        return updated

    def soft_delete_payable(self, payable_id: int, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(payable_id, active_only=False)
        if not existing:
            raise PayableNotFoundException(payable_id)

        deleted = self.repo.soft_delete(payable_id, updated_by=updated_by)
        if not deleted:
            raise PayableNotFoundException(payable_id)

        self.audit.log(
            table_name=TABLE_NAME,
            record_id=payable_id,
            action=ACTION_SOFT_DELETE,
            old_values=existing,
            new_values={"is_active": False},
            acted_by=updated_by,
            payable_id=payable_id,
            vendor_id=existing.get("vendor_id"),
            document_extraction_id=existing.get("document_extraction_id"),
        )

        return {"message": "Payable deleted successfully."}

    def create_payable_from_extraction(
        self,
        association_id: int,
        vendor_id: Optional[int],
        document_extraction_id: Optional[int],
        pay_to: str,
        date_of_payment: Any,
        amount: float,
        due_date: Any,
        invoice_reference_number: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """Auto-populate a payable record when an invoice is extracted."""
        existing = self.repo.get_by_document_extraction_id(document_extraction_id)
        if existing:
            return existing

        import datetime
        today_str = datetime.date.today().strftime("%Y-%m-%d")

        def _to_date_str(val):
            if isinstance(val, (datetime.date, datetime.datetime)):
                return val.strftime("%Y-%m-%d")
            if isinstance(val, str) and val.strip():
                return val.strip()
            return today_str

        data = {
            "association_id": association_id,
            "vendor_id": vendor_id,
            "document_extraction_id": document_extraction_id,
            "pay_to": pay_to or "Unknown Vendor",
            "date_of_payment": _to_date_str(date_of_payment),
            "amount": float(amount or 0.0),
            "due_date": _to_date_str(due_date),
            "instrument": "ACH",
            "status": "Pending",
            "created_by": created_by,
        }

        # invoice_reference_number carries the extracted invoice number onto the
        # payable. Guarded so invoice extraction still works before the column's
        # migration has been applied.
        if invoice_reference_number and self.repo.column_exists("invoice_reference_number"):
            data["invoice_reference_number"] = invoice_reference_number

        payable_id = self.repo.create(data)
        result = self.repo.get_by_id(payable_id)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=payable_id,
            action=ACTION_CREATE,
            new_values=result,
            acted_by=created_by,
            payable_id=payable_id,
            vendor_id=vendor_id,
            document_extraction_id=document_extraction_id,
        )
        return result
