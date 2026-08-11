from datetime import date
from typing import Optional

from app.core.exceptions import AppException
from app.modules.receivables.repository import ReceivableRepository

from .repository import SpecialAssessmentRepository


class AssessmentNotFoundException(AppException):

    def __init__(self, assessment_id: int):
        super().__init__(
            status_code=404,
            message=f"Special assessment with id {assessment_id} not found."
        )


class AllocationNotFoundException(AppException):

    def __init__(self, allocation_id: int):
        super().__init__(
            status_code=404,
            message=f"Assessment allocation with id {allocation_id} not found."
        )


class AssessmentService:

    def __init__(self, db):
        self.db = db
        self.repo = SpecialAssessmentRepository(db)
        self.receivable_repo = ReceivableRepository(db)

    def get_summary(self, association_id: Optional[int] = None) -> dict:
        return self.repo.get_summary(association_id=association_id)

    def list_assessments(
        self,
        association_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        return self.repo.get_all_assessments(
            association_id=association_id,
            status=status,
            page=page,
            page_size=page_size,
        )

    def get_assessment(self, assessment_id: int) -> dict:
        record = self.repo.get_assessment_by_id(assessment_id)
        if not record:
            raise AssessmentNotFoundException(assessment_id)
        return record

    def get_allocations(self, assessment_id: int) -> list[dict]:
        # Verify assessment exists
        record = self.repo.get_assessment_by_id(assessment_id)
        if not record:
            raise AssessmentNotFoundException(assessment_id)
        return self.repo.get_allocations_by_assessment(assessment_id)

    def get_all_allocations(self, association_id: Optional[int] = None) -> list[dict]:
        return self.repo.get_all_allocations(association_id=association_id)

    def create_assessment(
        self,
        association_id: int,
        title: str,
        description: Optional[str],
        total_amount: float,
        due_date: date,
        status: str = "Active",
        allocations: Optional[list[dict]] = None,
        created_by: Optional[int] = None,
    ) -> dict:
        """
        Create a special assessment with allocations and corresponding receivables.
        
        If allocations are provided, use custom per-unit amounts.
        Otherwise, split total_amount equally across all active units.
        """
        # Step 1: Create parent assessment
        assessment_id = self.repo.create_assessment(
            association_id=association_id,
            title=title,
            description=description,
            total_amount=total_amount,
            due_date=due_date,
            status=status,
            created_by=created_by,
        )

        # Step 2: Determine allocations
        if allocations:
            # Custom per-unit amounts — look up unit info from DB
            units = self.repo.get_active_units(association_id)
            unit_map = {u["id"]: u for u in units}
            alloc_data = []
            for alloc in allocations:
                unit = unit_map.get(alloc["unit_id"], {})
                alloc_data.append({
                    "unit_id": alloc["unit_id"],
                    "unit_number": unit.get("unit_number", ""),
                    "owner_name": unit.get("owner_name", ""),
                    "allocated_amount": alloc["allocated_amount"],
                })
        else:
            # Equal split across all active units
            units = self.repo.get_active_units(association_id)
            if not units:
                raise AppException(status_code=400, message="No active condo units found for this association.")

            per_unit_amount = round(total_amount / len(units), 2)
            alloc_data = []
            for unit in units:
                alloc_data.append({
                    "unit_id": unit["id"],
                    "unit_number": unit["unit_number"],
                    "owner_name": unit["owner_name"],
                    "allocated_amount": per_unit_amount,
                })

        # Step 3: Create allocations
        created_allocations = self.repo.create_allocations(
            assessment_id=assessment_id,
            allocations=alloc_data,
            created_by=created_by,
        )

        # Step 4: Create corresponding receivables for each allocation
        for alloc in created_allocations:
            self.receivable_repo.create_receivable(
                data={
                    "association_id": association_id,
                    "unit_id": alloc["unit_id"],
                    "from_payer": alloc.get("owner_name", ""),
                    "due_date": due_date,
                    "expected_amount": alloc["allocated_amount"],
                    "amount_received": 0.0,
                    "balance_amount": alloc["allocated_amount"],
                    "status": "Pending",
                    "assessment_allocation_id": alloc["id"],
                },
                created_by=created_by,
            )

        # Return full assessment with allocations
        assessment = self.repo.get_assessment_by_id(assessment_id)
        return {
            "assessment": assessment,
            "allocations": created_allocations,
        }

    def update_assessment(self, assessment_id: int, data: dict, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_assessment_by_id(assessment_id)
        if not existing:
            raise AssessmentNotFoundException(assessment_id)

        if not data:
            return existing

        # Convert enum values to strings
        update_data = {}
        for k, v in data.items():
            update_data[k] = v.value if hasattr(v, 'value') else v

        return self.repo.update_assessment(assessment_id, update_data, updated_by=updated_by)

    def update_allocation(self, allocation_id: int, data: dict, updated_by: Optional[int] = None) -> dict:
        existing = self.repo.get_allocation_by_id(allocation_id)
        if not existing:
            raise AllocationNotFoundException(allocation_id)

        if not data:
            return existing

        # Convert enum values
        update_data = {}
        for k, v in data.items():
            update_data[k] = v.value if hasattr(v, 'value') else v

        result = self.repo.update_allocation(allocation_id, update_data)

        # If allocation marked as Paid, check if all allocations are paid → update parent to Completed
        if update_data.get("status") == "Paid":
            assessment_id = existing["assessment_id"]
            if self.repo.check_all_allocations_paid(assessment_id):
                self.repo.update_assessment(assessment_id, {"status": "Completed"}, updated_by=updated_by)

        return result

    def create_allocation(self, assessment_id: int, unit_id: int,
                          allocated_amount: float,
                          created_by: Optional[int] = None) -> dict:
        """Create a single allocation for an existing assessment and its corresponding receivable."""
        # Verify assessment exists
        assessment = self.repo.get_assessment_by_id(assessment_id)
        if not assessment:
            raise AssessmentNotFoundException(assessment_id)

        # Look up unit info
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT unit_number, owner_name FROM condo_units WHERE id = %s",
            (unit_id,),
        )
        unit = cursor.fetchone()
        owner_name = unit["owner_name"] if unit else ""

        alloc_data = [{
            "unit_id": unit_id,
            "unit_number": unit["unit_number"] if unit else "",
            "owner_name": owner_name,
            "allocated_amount": allocated_amount,
        }]

        created_allocations = self.repo.create_allocations(
            assessment_id=assessment_id,
            allocations=alloc_data,
            created_by=created_by,
        )

        alloc = created_allocations[0]

        # Create corresponding receivable
        self.receivable_repo.create_receivable(
            data={
                "association_id": assessment["association_id"],
                "unit_id": unit_id,
                "from_payer": owner_name,
                "due_date": assessment["due_date"],
                "expected_amount": allocated_amount,
                "amount_received": 0.0,
                "balance_amount": allocated_amount,
                "status": "Pending",
                "assessment_allocation_id": alloc["id"],
            },
            created_by=created_by,
        )

        return alloc
