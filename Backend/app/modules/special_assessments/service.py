from datetime import date
from typing import Optional

from app.core.exceptions import AppException
from app.modules.bank_reconciliation.repository import ReconciliationRepository

from .repository import SpecialAssessmentRepository


class AssessmentNotFoundException(AppException):

    def __init__(self, assessment_id: int):
        super().__init__(
            status_code=404,
            message=f"Special assessment record with id {assessment_id} not found."
        )


class UnitNotFoundException(AppException):

    def __init__(self, unit_id: int):
        super().__init__(
            status_code=404,
            message=f"Condo unit with id {unit_id} not found."
        )


class AssessmentService:

    def __init__(self, db):
        self.db = db
        self.repo = ReconciliationRepository(db)
        self.sa_repo = SpecialAssessmentRepository(db)

    def get_summary(self) -> dict:
        return self.repo.get_assessment_summary()

    def list_assessments(
        self,
        unit_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_assessment_records(
            unit_id=unit_id,
            status=status,
            page=page,
            page_size=page_size,
        )

    def get_assessment(self, assessment_id: int) -> dict:
        record = self.repo.get_by_id(assessment_id)
        if not record or record.get("reconciliation_type") != "SpecialAssessment":
            raise AssessmentNotFoundException(assessment_id)
        return record

    def update_assessment(self, assessment_id: int, data: dict, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_by_id(assessment_id, active_only=False)
        if not existing or existing.get("reconciliation_type") != "SpecialAssessment":
            raise AssessmentNotFoundException(assessment_id)

        if not data:
            return existing

        new_status = data.get("status")
        if new_status in ("Matched", "Resolved") and existing["status"] in ("NeedsReview", "Unresolved"):
            self.repo.mark_transaction_reconciled(existing["bank_transaction_id"])

        return self.repo.update_reconciliation(assessment_id, data, updated_by=updated_by)

    def create_assessment(
        self,
        title: str,
        description: Optional[str],
        amount: float,
        due_date: date,
        status: str = "Active",
        created_by: Optional[int] = None,
    ) -> dict:
        units = self.sa_repo.get_active_units()
        if not units:
            raise AppException(status_code=400, message="No active condo units found.")

        records = self.sa_repo.bulk_create(
            units=units,
            title=title,
            description=description,
            amount=amount,
            due_date=due_date,
            status=status,
            created_by=created_by,
        )

        return {
            "title": title,
            "description": description,
            "amount": amount,
            "due_date": str(due_date),
            "status": status,
            "total_units": len(records),
            "assessments": records,
        }
