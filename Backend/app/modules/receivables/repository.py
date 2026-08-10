from typing import Any, Optional

from .model import TABLE_NAME


class ReceivableRepository:
    SELECT_COLUMNS = """
        r.*,
        cu.unit_number as unit_number
    """

    def __init__(self, db):
        self.db = db

    def get_by_id(self, receivable_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} r
        LEFT JOIN condo_units cu ON r.unit_id = cu.id
        WHERE r.id = %s
        """
        if active_only:
            query += " AND r.is_active = 1"

        cursor.execute(query, (receivable_id,))

        return cursor.fetchone()

    def get_filtered(self, filters) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["r.is_active = %s"]
        params: list[Any] = [int(filters.is_active)]

        if filters.association_id is not None:
            where.append("r.association_id = %s")
            params.append(filters.association_id)
        if filters.document_extraction_id is not None:
            where.append("r.document_extraction_id = %s")
            params.append(filters.document_extraction_id)
        if filters.unit_id is not None:
            where.append("r.unit_id = %s")
            params.append(filters.unit_id)
        if filters.from_payer:
            where.append("r.from_payer LIKE %s")
            params.append(f"%{filters.from_payer}%")
        if filters.due_date_from:
            where.append("r.due_date >= %s")
            params.append(filters.due_date_from)
        if filters.due_date_to:
            where.append("r.due_date <= %s")
            params.append(filters.due_date_to)
        if filters.deposit_month_from:
            where.append("r.deposit_month >= %s")
            params.append(filters.deposit_month_from)
        if filters.deposit_month_to:
            where.append("r.deposit_month <= %s")
            params.append(filters.deposit_month_to)
        if filters.instrument:
            where.append("r.instrument = %s")
            params.append(filters.instrument)
        if filters.status:
            where.append("r.status = %s")
            params.append(filters.status)
        if filters.bank:
            where.append("r.bank LIKE %s")
            params.append(f"%{filters.bank}%")
        if filters.created_by is not None:
            where.append("r.created_by = %s")
            params.append(filters.created_by)
        if filters.updated_by is not None:
            where.append("r.updated_by = %s")
            params.append(filters.updated_by)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} r WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (filters.page - 1) * filters.page_size
        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} r
        LEFT JOIN condo_units cu ON r.unit_id = cu.id
        WHERE {where_clause}
        ORDER BY r.created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [filters.page_size, offset])
        rows = cursor.fetchall()
        return rows, total

    def create_receivable(self, data: dict, created_by: Optional[int] = None) -> dict:
        cursor = self.db.cursor()

        columns = list(data.keys())
        values = list(data.values())
        
        if created_by is not None:
            columns.append("created_by")
            values.append(created_by)

        placeholders = ", ".join(["%s"] * len(columns))
        column_names = ", ".join(columns)

        query = f"""
        INSERT INTO {TABLE_NAME} ({column_names})
        VALUES ({placeholders})
        """

        cursor.execute(query, values)
        self.db.commit()

        receivable_id = cursor.lastrowid
        return self.get_by_id(receivable_id, active_only=False)

    def update_receivable(self, receivable_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(receivable_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, receivable_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(receivable_id, active_only=False)

    def soft_delete(self, receivable_id: int) -> bool:
        cursor = self.db.cursor()

        query = f"""
        UPDATE {TABLE_NAME}
        SET is_active = 0
        WHERE id = %s AND is_active = 1
        """

        cursor.execute(query, (receivable_id,))
        self.db.commit()

        return cursor.rowcount > 0

    def get_by_document_extraction_id(self, document_extraction_id: int) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} r
        LEFT JOIN condo_units cu ON r.unit_id = cu.id
        WHERE r.document_extraction_id = %s AND r.is_active = 1
        LIMIT 1
        """

        cursor.execute(query, (document_extraction_id,))

        return cursor.fetchall()