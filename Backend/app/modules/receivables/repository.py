from datetime import date
from typing import Any, Optional

from .model import TABLE_NAME


class ReceivableRepository:
    SELECT_COLUMNS = """
        r.id, r.association_id, r.document_extraction_id, r.unit_id, r.from_payer,
        r.due_date, r.expected_amount, r.amount_received, r.balance_amount,
        r.deposit_month, r.paid_date, r.status, r.bank, r.assessment_allocation_id,
        r.created_by, r.updated_by, r.created_at, r.updated_at, r.is_active, r.version,
        CASE
            WHEN LOWER(bt.description) LIKE '%ach%' THEN 'ACH'
            WHEN LOWER(bt.description) LIKE '%check%' THEN 'Cheque'
            WHEN LOWER(bt.description) LIKE '%cheque%' THEN 'Cheque'
            WHEN LOWER(bt.description) LIKE '%deposit%' THEN 'ACH'
            ELSE r.instrument
        END AS instrument
    """

    def __init__(self, db):
        self.db = db

    def get_by_id(self, receivable_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT {self.SELECT_COLUMNS}
        FROM {TABLE_NAME} r
        LEFT JOIN reconciliations recon ON recon.record_id = r.id AND recon.record_type = 'receivable' AND recon.status = 'Matched' AND recon.is_active = 1
        LEFT JOIN bank_transactions bt ON bt.id = recon.bank_transaction_id AND bt.is_active = 1
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
        LEFT JOIN reconciliations recon ON recon.record_id = r.id AND recon.record_type = 'receivable' AND recon.status = 'Matched' AND recon.is_active = 1
        LEFT JOIN bank_transactions bt ON bt.id = recon.bank_transaction_id AND bt.is_active = 1
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

    def get_active_units(self, association_id: int) -> list[dict]:
        """Get all active condo units with monthly_hoa_amount for an association."""
        cursor = self.db.cursor(dictionary=True)
        query = """
        SELECT id, unit_number, owner_name, monthly_hoa_amount, due_date
        FROM condo_units
        WHERE association_id = %s AND status = 'Active' AND is_active = 1
        """
        cursor.execute(query, (association_id,))
        return cursor.fetchall()

    def get_existing_unit_ids_for_month(self, association_id: int, month: date) -> set[int]:
        """Get unit_ids that already have a receivable for the given month."""
        cursor = self.db.cursor(dictionary=True)
        query = """
        SELECT DISTINCT unit_id
        FROM receivables
        WHERE association_id = %s
          AND unit_id IS NOT NULL
          AND MONTH(due_date) = %s
          AND YEAR(due_date) = %s
          AND is_active = 1
          AND assessment_allocation_id IS NULL
        """
        cursor.execute(query, (association_id, month.month, month.year))
        return {row["unit_id"] for row in cursor.fetchall()}

    def bulk_create_receivables(self, records: list[dict], created_by: Optional[int] = None) -> int:
        """Bulk insert receivables. Returns number of rows created."""
        if not records:
            return 0

        cursor = self.db.cursor()
        columns = list(records[0].keys())
        if created_by is not None:
            columns.append("created_by")

        placeholders = ", ".join(["%s"] * len(columns))
        column_names = ", ".join(columns)

        query = f"INSERT INTO {TABLE_NAME} ({column_names}) VALUES ({placeholders})"

        rows = []
        for rec in records:
            values = list(rec.values())
            if created_by is not None:
                values.append(created_by)
            rows.append(values)

        cursor.executemany(query, rows)
        self.db.commit()
        return cursor.rowcount