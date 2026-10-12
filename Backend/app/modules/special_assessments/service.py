from datetime import date
from typing import Optional

from app.core.exceptions import AppException

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
        self.sa_repo = SpecialAssessmentRepository(db)

    def get_summary(self) -> dict:
        return self.sa_repo.get_summary()

    def list_grouped(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.sa_repo.get_grouped(status=status, page=page, page_size=page_size)

    def list_assessments(
        self,
        unit_id: Optional[int] = None,
        status: Optional[str] = None,
        title: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.sa_repo.get_all(
            unit_id=unit_id,
            status=status,
            title=title,
            page=page,
            page_size=page_size,
        )

    def get_assessment(self, assessment_id: int) -> dict:
        record = self.sa_repo.get_by_id(assessment_id)
        if not record:
            raise AssessmentNotFoundException(assessment_id)
        return record

    def update_assessment(self, assessment_id: int, data: dict, updated_by: Optional[int] = None) -> dict:
        existing = self.sa_repo.get_by_id(assessment_id)
        if not existing:
            raise AssessmentNotFoundException(assessment_id)

        if not data:
            return existing

        # Update the special_assessments table directly
        cursor = self.db.cursor()
        set_clauses = []
        params = []
        for key, value in data.items():
            set_clauses.append(f"{key} = %s")
            params.append(value)

        if updated_by is not None:
            set_clauses.append("updated_by = %s")
            params.append(updated_by)

        set_clauses.append("updated_at = NOW()")
        params.append(assessment_id)

        cursor.execute(
            f"UPDATE special_assessments SET {', '.join(set_clauses)} WHERE id = %s",
            params,
        )
        self.db.commit()

        return self.sa_repo.get_by_id(assessment_id)

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
