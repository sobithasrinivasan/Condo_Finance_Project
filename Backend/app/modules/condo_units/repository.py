from typing import Optional

from .model import TABLE_NAME


class CondoUnitRepository:

    def __init__(self, db):
        self.db = db

    def create_unit(
        self,
        association_id: int,
        unit_number: str,
        owner_name: str,
        owner_email: Optional[str] = None,
        owner_phone: Optional[str] = None,
        address: Optional[str] = None,
        monthly_hoa_amount: float = 0.0,
        status: str = "Active",
        created_by: Optional[int] = None,
    ) -> int:
        cursor = self.db.cursor()

        query = f"""
        INSERT INTO {TABLE_NAME}
        (
            association_id, unit_number, owner_name, owner_email, owner_phone,
            address, monthly_hoa_amount, status, created_by, updated_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                association_id,
                unit_number,
                owner_name,
                owner_email,
                owner_phone,
                address,
                monthly_hoa_amount,
                status,
                created_by,
                created_by,
            ),
        )

        self.db.commit()

        return cursor.lastrowid

    def get_by_id(self, unit_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_NAME} WHERE id = %s"
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, (unit_id,))

        return cursor.fetchone()

    def get_by_unit_number(self, unit_number: str, association_id: int = None, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_NAME} WHERE unit_number = %s"
        params = [unit_number]

        if association_id is not None:
            query += " AND association_id = %s"
            params.append(association_id)
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, params)

        return cursor.fetchone()

    def get_all(
        self,
        association_id: Optional[int] = None,
        unit_number: Optional[str] = None,
        owner_name: Optional[str] = None,
        status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where = ["is_active = %s"]
        params: list = [int(is_active)]

        if association_id is not None:
            where.append("association_id = %s")
            params.append(association_id)
        if unit_number:
            where.append("unit_number LIKE %s")
            params.append(f"%{unit_number}%")
        if owner_name:
            where.append("owner_name LIKE %s")
            params.append(f"%{owner_name}%")
        if status:
            where.append("status = %s")
            params.append(status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        query = f"""
        SELECT *
        FROM {TABLE_NAME}
        WHERE {where_clause}
        ORDER BY unit_number ASC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def update_unit(self, unit_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(unit_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, unit_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(unit_id, active_only=False)

    def soft_delete_unit(self, unit_id: int, updated_by: Optional[int] = None) -> None:
        cursor = self.db.cursor()

        query = f"""
        UPDATE {TABLE_NAME}
        SET is_active = 0, status = 'Inactive', updated_by = %s, version = version + 1
        WHERE id = %s
        """

        cursor.execute(query, (updated_by, unit_id))
        self.db.commit()
