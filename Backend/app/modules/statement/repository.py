from typing import Any, Optional

from .model import TABLE_STATEMENTS, TABLE_TRANSACTIONS
from .schema import BankStatementFilters


class BankStatementRepository:

    def __init__(self, db):
        self.db = db

    def get_by_id(self, statement_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"SELECT * FROM {TABLE_STATEMENTS} WHERE id = %s"
        if active_only:
            query += " AND is_active = 1"

        cursor.execute(query, (statement_id,))

        return cursor.fetchone()

    def get_transactions_for_statements(
        self, statement_ids: list[int], active_only: bool = True
    ) -> dict[int, list[dict]]:
        if not statement_ids:
            return {}

        cursor = self.db.cursor(dictionary=True)

        placeholders = ", ".join(["%s"] * len(statement_ids))
        query = f"""
        SELECT * FROM {TABLE_TRANSACTIONS}
        WHERE bank_statement_id IN ({placeholders})
        """
        if active_only:
            query += " AND is_active = 1"
        query += " ORDER BY transaction_date DESC"

        cursor.execute(query, statement_ids)
        rows = cursor.fetchall()

        grouped: dict[int, list[dict]] = {sid: [] for sid in statement_ids}
        for row in rows:
            grouped.setdefault(row["bank_statement_id"], []).append(row)
        return grouped

    def get_filtered(self, filters: BankStatementFilters) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["s.is_active = %s"]
        params: list[Any] = [int(filters.is_active)]

        if filters.association_id is not None:
            where.append("s.association_id = %s")
            params.append(filters.association_id)
        if filters.document_extraction_id is not None:
            where.append("s.document_extraction_id = %s")
            params.append(filters.document_extraction_id)
        if filters.bank_account_id is not None:
            where.append("s.bank_account_id = %s")
            params.append(filters.bank_account_id)
        if filters.statement_name:
            where.append("s.statement_name LIKE %s")
            params.append(f"%{filters.statement_name}%")
        if filters.statement_period is not None:
            where.append("s.statement_period = %s")
            params.append(filters.statement_period)
        if filters.period_month is not None:
            where.append("s.period_month = %s")
            params.append(filters.period_month)
        if filters.uploaded_by is not None:
            where.append("s.uploaded_by = %s")
            params.append(filters.uploaded_by)
        if filters.status:
            where.append("s.status = %s")
            params.append(filters.status)
        if filters.created_by is not None:
            where.append("s.created_by = %s")
            params.append(filters.created_by)
        if filters.updated_by is not None:
            where.append("s.updated_by = %s")
            params.append(filters.updated_by)
        if filters.created_from:
            where.append("DATE(s.created_at) >= %s")
            params.append(filters.created_from)
        if filters.created_to:
            where.append("DATE(s.created_at) <= %s")
            params.append(filters.created_to)

        txn_conditions: list[str] = ["t.bank_statement_id = s.id", "t.is_active = 1"]
        txn_params: list[Any] = []

        if filters.transaction_type:
            txn_conditions.append("t.transaction_type = %s")
            txn_params.append(filters.transaction_type)
        if filters.description:
            txn_conditions.append("t.description LIKE %s")
            txn_params.append(f"%{filters.description}%")
        if filters.amount_min is not None:
            txn_conditions.append("t.amount >= %s")
            txn_params.append(filters.amount_min)
        if filters.amount_max is not None:
            txn_conditions.append("t.amount <= %s")
            txn_params.append(filters.amount_max)
        if filters.transaction_date_from:
            txn_conditions.append("t.transaction_date >= %s")
            txn_params.append(filters.transaction_date_from)
        if filters.transaction_date_to:
            txn_conditions.append("t.transaction_date <= %s")
            txn_params.append(filters.transaction_date_to)
        if filters.reconciled is not None:
            txn_conditions.append("t.reconciled = %s")
            txn_params.append(int(filters.reconciled))

        has_txn_filter = len(txn_conditions) > 2
        if has_txn_filter:
            where.append(
                f"EXISTS (SELECT 1 FROM {TABLE_TRANSACTIONS} t WHERE {' AND '.join(txn_conditions)})"
            )
            params = params + txn_params

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_STATEMENTS} s WHERE {where_clause}", params
        )
        total = cursor.fetchone()["total"]

        offset = (filters.page - 1) * filters.page_size
        query = f"""
        SELECT s.*
        FROM {TABLE_STATEMENTS} s
        WHERE {where_clause}
        ORDER BY s.created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [filters.page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def soft_delete(self, statement_id: int, updated_by: Optional[int] = None) -> None:
        cursor = self.db.cursor()

        cursor.execute(
            f"""
            UPDATE {TABLE_STATEMENTS}
            SET is_active = 0, updated_by = %s, version = version + 1
            WHERE id = %s
            """,
            (updated_by, statement_id),
        )

        cursor.execute(
            f"""
            UPDATE {TABLE_TRANSACTIONS}
            SET is_active = 0, updated_by = %s, version = version + 1
            WHERE bank_statement_id = %s
            """,
            (updated_by, statement_id),
        )

        self.db.commit()