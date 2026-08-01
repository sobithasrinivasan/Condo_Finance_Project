from datetime import date
from typing import Optional

from .model import TABLE_NAME


class SpecialAssessmentRepository:

    def __init__(self, db):
        self.db = db

    def get_active_units(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, unit_number, owner_name FROM condo_units WHERE is_active = 1 AND status = 'Active' ORDER BY unit_number"
        )
        return cursor.fetchall()

    def get_unit_by_id(self, unit_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, unit_number, owner_name FROM condo_units WHERE id = %s AND is_active = 1",
            (unit_id,),
        )
        return cursor.fetchone()

    def bulk_create(
        self,
        units: list[dict],
        title: str,
        description: Optional[str],
        amount: float,
        due_date: date,
        status: str = "Active",
        created_by: Optional[int] = None,
    ) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        created_records = []

        for unit in units:
            cursor.execute(
                f"""
                INSERT INTO {TABLE_NAME} (unit_id, title, description, amount, due_date, status, created_by, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (unit["id"], title, description, amount, due_date, status, created_by, created_by),
            )
            new_id = cursor.lastrowid
            created_records.append({
                "id": new_id,
                "unit_id": unit["id"],
                "unit_number": unit["unit_number"],
                "owner_name": unit["owner_name"],
                "amount": amount,
                "status": status,
            })

        self.db.commit()
        return created_records

    def get_all(
        self,
        unit_id: Optional[int] = None,
        status: Optional[str] = None,
        title: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Get all special assessments from the special_assessments table with unit info."""
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = []
        params: list = []

        if unit_id is not None:
            where.append("sa.unit_id = %s")
            params.append(unit_id)
        if status:
            where.append("sa.status = %s")
            params.append(status)
        if title:
            where.append("sa.title = %s")
            params.append(title)

        where_clause = " AND ".join(where) if where else "1=1"

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} sa WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT sa.*, cu.unit_number, cu.owner_name
            FROM {TABLE_NAME} sa
            JOIN condo_units cu ON sa.unit_id = cu.id
            WHERE {where_clause}
            ORDER BY sa.due_date DESC, cu.unit_number ASC
            LIMIT %s OFFSET %s
            """,
            params + [page_size, offset],
        )

        return cursor.fetchall(), total

    def get_by_id(self, assessment_id: int) -> Optional[dict]:
        """Get a single special assessment by ID with unit info."""
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT sa.*, cu.unit_number, cu.owner_name
            FROM {TABLE_NAME} sa
            JOIN condo_units cu ON sa.unit_id = cu.id
            WHERE sa.id = %s
            """,
            (assessment_id,),
        )
        return cursor.fetchone()

    def get_summary(self) -> dict:
        """Get summary stats for UI cards."""
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            f"""
            SELECT
                COUNT(DISTINCT title) as total_active_assessments,
                COALESCE(SUM(CASE WHEN status IN ('Active', 'Pending') THEN amount ELSE 0 END), 0) as pending_collection,
                COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as collected_ytd,
                COUNT(*) as total_records,
                SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status IN ('Active', 'Pending') THEN 1 ELSE 0 END) as outstanding_count
            FROM {TABLE_NAME}
            """
        )
        summary = cursor.fetchone()

        # Get upcoming due date
        cursor.execute(
            f"""
            SELECT title, due_date
            FROM {TABLE_NAME}
            WHERE due_date >= CURDATE() AND status IN ('Active', 'Pending')
            GROUP BY title, due_date
            ORDER BY due_date ASC
            LIMIT 1
            """
        )
        upcoming = cursor.fetchone()
        summary["upcoming_due_date"] = str(upcoming["due_date"]) if upcoming else None
        summary["upcoming_title"] = upcoming["title"] if upcoming else None

        return summary

    def get_grouped(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Get assessments grouped by title (one row per assessment project)."""
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = []
        params: list = []

        if status:
            where.append("sa.status = %s")
            params.append(status)

        where_clause = " AND ".join(where) if where else "1=1"

        # Count distinct assessments
        cursor.execute(
            f"""
            SELECT COUNT(*) as total FROM (
                SELECT DISTINCT title FROM {TABLE_NAME} sa WHERE {where_clause}
            ) t
            """,
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT
                sa.title,
                sa.description,
                sa.amount,
                sa.due_date,
                MIN(sa.created_at) as created_at,
                COUNT(*) as total_units,
                SUM(CASE WHEN sa.status = 'Paid' THEN 1 ELSE 0 END) as paid_units,
                CASE
                    WHEN SUM(CASE WHEN sa.status = 'Paid' THEN 1 ELSE 0 END) = COUNT(*) THEN 'Completed'
                    WHEN sa.due_date > CURDATE() AND SUM(CASE WHEN sa.status = 'Paid' THEN 1 ELSE 0 END) = 0 THEN 'Upcoming'
                    ELSE 'Active'
                END as assessment_status
            FROM {TABLE_NAME} sa
            WHERE {where_clause}
            GROUP BY sa.title, sa.description, sa.amount, sa.due_date
            ORDER BY sa.due_date DESC
            LIMIT %s OFFSET %s
            """,
            params + [page_size, offset],
        )

        return cursor.fetchall(), total
