from typing import Optional

from app.core.exceptions import AppException
from app.modules.bank_reconciliation.repository import ReconciliationRepository


class DepositNotFoundException(AppException):

    def __init__(self, deposit_id: int):
        super().__init__(
            status_code=404,
            message=f"Deposit record with id {deposit_id} not found."
        )


class DepositService:

    def __init__(self, db):
        self.db = db
        self.repo = ReconciliationRepository(db)

    def get_summary(
        self,
        deposit_month: Optional[int] = None,
        deposit_year: Optional[int] = None,
    ) -> dict:
        return self.repo.get_deposit_summary(
            deposit_month=deposit_month,
            deposit_year=deposit_year,
        )

    def list_deposits(
        self,
        unit_id: Optional[int] = None,
        deposit_month: Optional[int] = None,
        deposit_year: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_deposit_records(
            unit_id=unit_id,
            deposit_month=deposit_month,
            deposit_year=deposit_year,
            status=status,
            page=page,
            page_size=page_size,
        )

    def get_deposit(self, deposit_id: int) -> dict:
        record = self.repo.get_by_id(deposit_id)
        if not record or record.get("reconciliation_type") != "Deposit":
            raise DepositNotFoundException(deposit_id)
        return record

    def update_deposit(self, deposit_id: int, data: dict, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(deposit_id, active_only=False)
        if not existing or existing.get("reconciliation_type") != "Deposit":
            raise DepositNotFoundException(deposit_id)

        if not data:
            return existing

        # If resolving, mark transaction as reconciled
        new_status = data.get("status")
        if new_status in ("Matched", "Resolved") and existing["status"] in ("NeedsReview", "Unresolved"):
            self.repo.mark_transaction_reconciled(existing["bank_transaction_id"])

        return self.repo.update_reconciliation(deposit_id, data, updated_by=updated_by)
