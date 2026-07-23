from typing import Any, Optional

from .model import TABLE_NAME


class InvoiceRepository:

    def __init__(self, db):
        self.db = db

    def get_by_id(self, invoice_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_NAME} WHERE id = %s"
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, (invoice_id,))

        return cursor.fetchone()

    def get_filtered(self, filters) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["is_active = %s"]
        params: list[Any] = [int(filters.is_active)]

        if filters.invoice_number:
            where.append("invoice_number LIKE %s")
            params.append(f"%{filters.invoice_number}%")
        if filters.vendor_id is not None:
            where.append("vendor_id = %s")
            params.append(filters.vendor_id)
        if filters.status:
            where.append("status = %s")
            params.append(filters.status)
        if filters.source:
            where.append("source = %s")
            params.append(filters.source)
        if filters.gmail_message_id:
            where.append("gmail_message_id = %s")
            params.append(filters.gmail_message_id)
        if filters.approved_by is not None:
            where.append("approved_by = %s")
            params.append(filters.approved_by)
        if filters.created_by is not None:
            where.append("created_by = %s")
            params.append(filters.created_by)
        if filters.updated_by is not None:
            where.append("updated_by = %s")
            params.append(filters.updated_by)
        if filters.amount_min is not None:
            where.append("amount >= %s")
            params.append(filters.amount_min)
        if filters.amount_max is not None:
            where.append("amount <= %s")
            params.append(filters.amount_max)
        if filters.invoice_date_from:
            where.append("invoice_date >= %s")
            params.append(filters.invoice_date_from)
        if filters.invoice_date_to:
            where.append("invoice_date <= %s")
            params.append(filters.invoice_date_to)
        if filters.due_date_from:
            where.append("due_date >= %s")
            params.append(filters.due_date_from)
        if filters.due_date_to:
            where.append("due_date <= %s")
            params.append(filters.due_date_to)
        if filters.created_from:
            where.append("DATE(created_at) >= %s")
            params.append(filters.created_from)
        if filters.created_to:
            where.append("DATE(created_at) <= %s")
            params.append(filters.created_to)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (filters.page - 1) * filters.page_size
        query = f"""
        SELECT *
        FROM {TABLE_NAME}
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [filters.page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def update_invoice(self, invoice_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(invoice_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, invoice_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(invoice_id, active_only=False)
