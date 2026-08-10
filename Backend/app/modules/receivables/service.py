import logging
from datetime import datetime
from typing import Optional

from app.core.audit import ACTION_CREATE, ACTION_SOFT_DELETE, ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException

from .model import ALLOWED_STATUSES, TABLE_NAME
from .repository import ReceivableRepository
from .schema import ReceivableFilters, ReceivableUpdate

logger = logging.getLogger(__name__)


class ReceivableNotFoundException(AppException):

    def __init__(self, receivable_id: int):
        super().__init__(
            status_code=404,
            message=f"Receivable with id {receivable_id} not found."
        )


class ReceivableService:

    def __init__(self, db):
        self.db = db
        self.repo = ReceivableRepository(db)
        self.audit = AuditLogger(db)

    def get_receivable(self, receivable_id: int) -> dict:
        receivable = self.repo.get_by_id(receivable_id)
        if not receivable:
            raise ReceivableNotFoundException(receivable_id)
        return receivable

    def list_receivables(self, filters: ReceivableFilters) -> tuple[list[dict], int]:
        rows, total = self.repo.get_filtered(filters)
        return rows, total

    def create_receivable(self, payload, created_by: Optional[int] = None) -> dict:
        data = payload.model_dump(exclude_unset=True)
        
        # Set default values
        data.setdefault("amount_received", 0.0)
        data.setdefault("status", "Pending")
        data.setdefault("instrument", "ACH")
        data.setdefault("is_active", True)
        data.setdefault("version", 1)
        
        # Calculate balance_amount if not provided
        if "balance_amount" not in data or data["balance_amount"] is None:
            data["balance_amount"] = data["expected_amount"] - data["amount_received"]
        
        result = self.repo.create_receivable(data, created_by=created_by)
        receivable_id = result["id"]
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=receivable_id,
            action=ACTION_CREATE,
            new_values=result,
            acted_by=created_by or data.get("created_by"),
            receivable_id=receivable_id,
            document_extraction_id=data.get("document_extraction_id"),
            vendor_id=None,
        )
        return result

    def update_receivable(self, receivable_id: int, payload: ReceivableUpdate, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(receivable_id, active_only=False)
        if not existing:
            raise ReceivableNotFoundException(receivable_id)

        data = payload.get_update_fields()

        if not data:
            return existing

        # Recalculate balance_amount if amount_received or expected_amount is updated
        if "amount_received" in data or "expected_amount" in data:
            expected = data.get("expected_amount", existing["expected_amount"])
            received = data.get("amount_received", existing["amount_received"])
            data["balance_amount"] = expected - received

        # Update status based on payment
        if "amount_received" in data or "expected_amount" in data:
            expected = data.get("expected_amount", existing["expected_amount"])
            received = data.get("amount_received", existing["amount_received"])
            
            if received >= expected and expected > 0:
                data["status"] = "Paid"
                if "paid_date" not in data:
                    from datetime import date
                    data["paid_date"] = date.today()
            elif received > 0 and received < expected:
                data["status"] = "partial"

        updated = self.repo.update_receivable(receivable_id, data, updated_by=updated_by)
        self.audit.log(
            table_name=TABLE_NAME,
            record_id=receivable_id,
            action=ACTION_UPDATE,
            old_values=existing,
            new_values=updated,
            acted_by=updated_by,
            receivable_id=receivable_id,
            document_extraction_id=updated.get("document_extraction_id") or existing.get("document_extraction_id"),
        )
        return updated

    def soft_delete_receivable(self, receivable_id: int, updated_by: Optional[int] = None) -> bool:
        receivable = self.repo.get_by_id(receivable_id, active_only=False)
        if not receivable:
            raise ReceivableNotFoundException(receivable_id)
        
        deleted = self.repo.soft_delete(receivable_id)
        if deleted:
            self.audit.log(
                table_name=TABLE_NAME,
                record_id=receivable_id,
                action=ACTION_SOFT_DELETE,
                old_values=receivable,
                new_values={"is_active": False},
                acted_by=updated_by,
                receivable_id=receivable_id,
                document_extraction_id=receivable.get("document_extraction_id"),
            )
        return deleted

    def populate_from_bank_statement(self, association_id: int, document_extraction_id: int, 
                                     transactions: list[dict], created_by: Optional[int] = None) -> list[dict]:
        """
        Populate receivables from bank statement transactions.
        
        Args:
            association_id: The association ID
            document_extraction_id: The document extraction ID from bank statement
            transactions: List of transaction dicts with keys:
                - from_payer: str
                - due_date: date
                - expected_amount: float
                - amount_received: float
                - deposit_month: date
                - instrument: str (ACH, Cheque, Card, Cash, Other)
                - paid_date: date
                - bank: str
                - unit_id: Optional[int]
            created_by: User ID who created the record
        
        Returns:
            List of created receivable dicts
        """
        if document_extraction_id:
            existing_records = self.repo.get_by_document_extraction_id(document_extraction_id)
            if existing_records:
                self.repo.soft_delete_by_document_extraction_id(
                    document_extraction_id,
                    updated_by=created_by,
                )

        created_receivables = []
        
        for transaction in transactions:
            try:
                expected = float(transaction.get("expected_amount", 0.0) or 0.0)
                received = float(transaction.get("amount_received", 0.0) or 0.0)
                balance = expected - received

                receivable_data = {
                    "association_id": association_id,
                    "document_extraction_id": document_extraction_id,
                    "unit_id": transaction.get("unit_id"),
                    "from_payer": transaction["from_payer"],
                    "due_date": transaction["due_date"],
                    "expected_amount": expected,
                    "amount_received": received,
                    "balance_amount": balance,
                    "deposit_month": transaction["deposit_month"],
                    "instrument": transaction.get("instrument", "ACH"),
                    "paid_date": transaction.get("paid_date"),
                    "status": "Pending",
                    "bank": transaction.get("bank"),
                    "is_active": True,
                    "version": 1
                }

                created = self.repo.create_receivable(receivable_data, created_by=created_by)
                self.audit.log(
                    table_name=TABLE_NAME,
                    record_id=created["id"],
                    action=ACTION_CREATE,
                    new_values=created,
                    acted_by=created_by,
                    receivable_id=created["id"],
                    document_extraction_id=document_extraction_id,
                )
                created_receivables.append(created)
            except Exception as exc:
                logger.exception(
                    "Failed to create receivable for document_extraction_id=%s transaction=%s: %s",
                    document_extraction_id,
                    transaction,
                    exc,
                )
        
        return created_receivables
