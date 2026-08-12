from datetime import date, datetime
from typing import Optional

from app.core.audit import ACTION_CREATE, ACTION_SOFT_DELETE, ACTION_UPDATE, AuditLogger
from app.core.exceptions import AppException

from .model import ALLOWED_STATUSES, TABLE_NAME
from .repository import ReceivableRepository
from .schema import GenerateMonthlyRequest, ReceivableFilters, ReceivableUpdate


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



    def generate_monthly_receivables(self, association_id: int, month: date, created_by: Optional[int] = None) -> dict:
        """
        Generate monthly HOA receivables for all active units in an association.
        
        Skips units that already have a receivable for the given month.
        Uses condo_units.monthly_hoa_amount as the expected_amount.
        
        Returns:
            dict with 'created' count and 'skipped' count
        """
        # Get all active units
        units = self.repo.get_active_units(association_id)
        if not units:
            return {"created": 0, "skipped": 0, "total_units": 0}

        # Find which units already have receivables for this month
        existing_unit_ids = self.repo.get_existing_unit_ids_for_month(association_id, month)

        # Build receivable records for units that don't have one yet
        records = []
        for unit in units:
            if unit["id"] in existing_unit_ids:
                continue
            if not unit["monthly_hoa_amount"] or unit["monthly_hoa_amount"] <= 0:
                continue

            # Use the day from condo_units.due_date, combined with the selected month/year
            day = 16  # default
            if unit.get("due_date"):
                day = unit["due_date"].day
            # Handle months with fewer days (e.g., Feb 28)
            import calendar
            max_day = calendar.monthrange(month.year, month.month)[1]
            actual_day = min(day, max_day)
            unit_due_date = date(month.year, month.month, actual_day)

            records.append({
                "association_id": association_id,
                "unit_id": unit["id"],
                "from_payer": unit["owner_name"],
                "due_date": unit_due_date,
                "expected_amount": float(unit["monthly_hoa_amount"]),
                "amount_received": 0.0,
                "balance_amount": float(unit["monthly_hoa_amount"]),
                "status": "Pending",
                "is_active": True,
                "version": 1,
            })

        created_count = self.repo.bulk_create_receivables(records, created_by=created_by)

        return {
            "created": created_count,
            "skipped": len(existing_unit_ids),
            "total_units": len(units),
        }