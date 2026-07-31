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
