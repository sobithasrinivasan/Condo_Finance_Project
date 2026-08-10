from datetime import date
from typing import Optional

from .model import TABLE_NAME, TABLE_ALLOCATIONS


class SpecialAssessmentRepository:

    def __init__(self, db):
        self.db = db

    # ── Unit helpers ──────────────────────────────────────────────────

    def get_active_units(self, association_id: int) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, unit_number, owner_name FROM condo_units WHERE association_id = %s AND is_active = 1 AND status = 'Active' ORDER BY unit_number",
            (association_id,),
        )
        return cursor.fetchall()

    # ── Parent Assessment CRUD ────────────────────────────────────────

    def create_assessment(
        self,
        association_id: int,
        title: str,
        description: Optional[str],
        total_amount: float,
        due_date: date,
        status: str = "Active",
        created_by: Optional[int] = None,
    ) -> int:
        cursor = self.db.cursor()
        cursor.execute(
            f"""
            INSERT INTO {TABLE_NAME} (association_id, title, description, total_amount, due_date, status, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (association_id, title, description, total_amount, due_date, status, created_by),
        )
        self.db.commit()
        return cursor.lastrowid

    def get_assessment_by_id(self, assessment_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT sa.*,
                   COUNT(aa.id) as total_units,
                   SUM(CASE WHEN aa.status = 'Paid' THEN 1 ELSE 0 END) as paid_units,
                   COALESCE(SUM(aa.paid_amount), 0) as total_collected
            FROM {TABLE_NAME} sa
            LEFT JOIN {TABLE_ALLOCATIONS} aa ON sa.id = aa.assessment_id
            WHERE sa.id = %s
            GROUP BY sa.id
            """,
            (assessment_id,),
        )
        return cursor.fetchone()

    def get_all_assessments(
        self,
        association_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = []
        params: list = []

        if association_id is not None:
            where.append("sa.association_id = %s")
            params.append(association_id)
        if status:
            where.append("sa.status = %s")
            params.append(status)

        where_clause = " AND ".join(where) if where else "1=1"

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} sa WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT sa.*,
                   COUNT(aa.id) as total_units,
                   SUM(CASE WHEN aa.status = 'Paid' THEN 1 ELSE 0 END) as paid_units,
                   COALESCE(SUM(aa.paid_amount), 0) as total_collected
            FROM {TABLE_NAME} sa
            LEFT JOIN {TABLE_ALLOCATIONS} aa ON sa.id = aa.assessment_id
            WHERE {where_clause}
            GROUP BY sa.id
            ORDER BY sa.due_date DESC
            LIMIT %s OFFSET %s
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        return rows, total

    def update_assessment(self, assessment_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_assessment_by_id(assessment_id)

        cursor = self.db.cursor()

        set_clauses = [f"{k} = %s" for k in data.keys()]
        values = list(data.values())

        if updated_by is not None:
            set_clauses.append("updated_by = %s")
            values.append(updated_by)
        set_clauses.append("updated_at = NOW()")

        values.append(assessment_id)

        cursor.execute(
            f"UPDATE {TABLE_NAME} SET {', '.join(set_clauses)} WHERE id = %s",
            values,
        )
        self.db.commit()
        return self.get_assessment_by_id(assessment_id)

    def get_summary(self, association_id: Optional[int] = None) -> dict:
        cursor = self.db.cursor(dictionary=True)

        where = "1=1"
        params: list = []
        if association_id:
            where = "sa.association_id = %s"
            params.append(association_id)

        cursor.execute(
            f"""
            SELECT
                COUNT(DISTINCT sa.id) as total_active_assessments,
                COALESCE(SUM(CASE WHEN aa.status IN ('Pending', 'Partial') THEN aa.allocated_amount - aa.paid_amount ELSE 0 END), 0) as pending_collection,
                COALESCE(SUM(aa.paid_amount), 0) as collected_ytd,
                COUNT(aa.id) as total_records,
                SUM(CASE WHEN aa.status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN aa.status IN ('Pending', 'Partial') THEN 1 ELSE 0 END) as outstanding_count
            FROM {TABLE_NAME} sa
            LEFT JOIN {TABLE_ALLOCATIONS} aa ON sa.id = aa.assessment_id
            WHERE {where} AND sa.status IN ('Active', 'Upcoming')
            """,
            params,
        )
        summary = cursor.fetchone()

        # Get upcoming due date
        cursor.execute(
            f"""
            SELECT title, due_date
            FROM {TABLE_NAME}
            WHERE due_date >= CURDATE() AND status IN ('Active', 'Upcoming')
            {"AND association_id = %s" if association_id else ""}
            ORDER BY due_date ASC
            LIMIT 1
            """,
            params,
        )
        upcoming = cursor.fetchone()
        summary["upcoming_due_date"] = str(upcoming["due_date"]) if upcoming else None
        summary["upcoming_title"] = upcoming["title"] if upcoming else None

        return summary

    # ── Allocations CRUD ──────────────────────────────────────────────

    def create_allocations(self, assessment_id: int, allocations: list[dict], created_by: Optional[int] = None) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        created = []

        for alloc in allocations:
            cursor.execute(
                f"""
                INSERT INTO {TABLE_ALLOCATIONS} (assessment_id, unit_id, allocated_amount, paid_amount, status, created_by)
                VALUES (%s, %s, %s, 0, 'Pending', %s)
                """,
                (assessment_id, alloc["unit_id"], alloc["allocated_amount"], created_by),
            )
            alloc_id = cursor.lastrowid
            created.append({
                "id": alloc_id,
                "assessment_id": assessment_id,
                "unit_id": alloc["unit_id"],
                "unit_number": alloc.get("unit_number", ""),
                "owner_name": alloc.get("owner_name", ""),
                "allocated_amount": alloc["allocated_amount"],
                "paid_amount": 0.0,
                "status": "Pending",
            })

        self.db.commit()
        return created

    def get_allocations_by_assessment(self, assessment_id: int) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT aa.*, cu.unit_number, cu.owner_name
            FROM {TABLE_ALLOCATIONS} aa
            JOIN condo_units cu ON aa.unit_id = cu.id
            WHERE aa.assessment_id = %s
            ORDER BY cu.unit_number ASC
            """,
            (assessment_id,),
        )
        return cursor.fetchall()

    def get_allocation_by_id(self, allocation_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT aa.*, cu.unit_number, cu.owner_name
            FROM {TABLE_ALLOCATIONS} aa
            JOIN condo_units cu ON aa.unit_id = cu.id
            WHERE aa.id = %s
            """,
            (allocation_id,),
        )
        return cursor.fetchone()

    def update_allocation(self, allocation_id: int, data: dict) -> Optional[dict]:
        if not data:
            return self.get_allocation_by_id(allocation_id)

        cursor = self.db.cursor()

        set_clauses = [f"{k} = %s" for k in data.keys()]
        values = list(data.values())
        set_clauses.append("updated_at = NOW()")
        values.append(allocation_id)

        cursor.execute(
            f"UPDATE {TABLE_ALLOCATIONS} SET {', '.join(set_clauses)} WHERE id = %s",
            values,
        )
        self.db.commit()
        return self.get_allocation_by_id(allocation_id)

    def check_all_allocations_paid(self, assessment_id: int) -> bool:
        """Check if all allocations for an assessment are Paid."""
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT COUNT(*) as total, SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid
            FROM {TABLE_ALLOCATIONS}
            WHERE assessment_id = %s
            """,
            (assessment_id,),
        )
        result = cursor.fetchone()
        return result["total"] > 0 and result["total"] == result["paid"]
