from typing import Any, Optional

from .model import TABLE_NAME


class PayableRepository:
    VENDOR_JOIN = "LEFT JOIN vendors v ON p.vendor_id = v.id"
    SELECT_COLUMNS = """
        p.*,
        v.name AS vendor_name
    """

    def __init__(self, db):
        self.db = db

    def create(self, data: dict) -> int:
        cursor = self.db.cursor()

        columns = list(data.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        column_str = ", ".join(columns)

        query = f"""
        INSERT INTO {TABLE_NAME} ({column_str})
        VALUES ({placeholders})
        """

        cursor.execute(query, list(data.values()))
        self.db.commit()

        return cursor.lastrowid

    def get_by_id(self, payable_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} p
        {self.VENDOR_JOIN}
        WHERE p.id = %s
        """
        if active_only:
            query += " AND p.is_active = 1"

        cursor.execute(query, (payable_id,))

        return cursor.fetchone()

    def get_filtered(self, filters) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["p.is_active = %s"]
        params: list[Any] = [int(filters.is_active)]

        if filters.association_id is not None:
            where.append("p.association_id = %s")
            params.append(filters.association_id)
        if filters.vendor_id is not None:
            where.append("p.vendor_id = %s")
            params.append(filters.vendor_id)
        if filters.document_extraction_id is not None:
            where.append("p.document_extraction_id = %s")
            params.append(filters.document_extraction_id)
        if filters.pay_to:
            where.append("p.pay_to LIKE %s")
            params.append(f"%{filters.pay_to}%")
        if filters.status:
            where.append("p.status = %s")
            params.append(filters.status)
        if filters.instrument:
            where.append("p.instrument = %s")
            params.append(filters.instrument)
        if filters.created_by is not None:
            where.append("p.created_by = %s")
            params.append(filters.created_by)
        if filters.updated_by is not None:
            where.append("p.updated_by = %s")
            params.append(filters.updated_by)
        if filters.amount_min is not None:
            where.append("p.amount >= %s")
            params.append(filters.amount_min)
        if filters.amount_max is not None:
            where.append("p.amount <= %s")
            params.append(filters.amount_max)
        if filters.date_of_payment_from:
            where.append("p.date_of_payment >= %s")
            params.append(filters.date_of_payment_from)
        if filters.date_of_payment_to:
            where.append("p.date_of_payment <= %s")
            params.append(filters.date_of_payment_to)
        if filters.due_date_from:
            where.append("p.due_date >= %s")
            params.append(filters.due_date_from)
        if filters.due_date_to:
            where.append("p.due_date <= %s")
            params.append(filters.due_date_to)
        if filters.created_from:
            where.append("DATE(p.created_at) >= %s")
            params.append(filters.created_from)
        if filters.created_to:
            where.append("DATE(p.created_at) <= %s")
            params.append(filters.created_to)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} p WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (filters.page - 1) * filters.page_size
        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} p
        {self.VENDOR_JOIN}
        WHERE {where_clause}
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [filters.page_size, offset])
        rows = cursor.fetchall()
        return rows, total

    def update(self, payable_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(payable_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, payable_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(payable_id, active_only=False)

    def soft_delete(self, payable_id: int, updated_by: Optional[int] = None) -> bool:
        cursor = self.db.cursor()

        query = f"""
        UPDATE {TABLE_NAME}
        SET is_active = 0, updated_by = %s, version = version + 1
        WHERE id = %s
        """

        cursor.execute(query, (updated_by, payable_id))
        self.db.commit()

        return cursor.rowcount > 0

    def get_by_document_extraction_id(self, document_extraction_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} p
        {self.VENDOR_JOIN}
        WHERE p.document_extraction_id = %s AND p.is_active = 1
        LIMIT 1
        """

        cursor.execute(query, (document_extraction_id,))

        return cursor.fetchone()