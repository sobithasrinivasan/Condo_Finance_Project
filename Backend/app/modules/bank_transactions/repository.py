from typing import Any, Optional

from .model import TABLE_NAME


class BankTransactionRepository:

    def __init__(self, db):
        self.db = db

    def get_by_id(self, transaction_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT bt.*,
               r.id as reconciliation_id,
               r.reconciliation_type,
               r.status as reconciliation_status,
               r.match_score,
               r.payment_status,
               CASE
                   WHEN r.reconciliation_type = 'Deposit' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                   WHEN r.reconciliation_type = 'SpecialAssessment' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('Special Assessment - Unit ', cu.unit_number)
                   WHEN r.reconciliation_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                       THEN inv.invoice_number
                   WHEN r.reconciliation_type = 'BankFee'
                       THEN 'Bank Fee'
                   WHEN r.reconciliation_type = 'Interest'
                       THEN 'Interest Credit'
                   ELSE NULL
               END as matched_record_name
        FROM {TABLE_NAME} bt
        LEFT JOIN reconciliation_records r ON bt.id = r.bank_transaction_id AND r.is_active = 1
        LEFT JOIN condo_units cu ON r.reconciliation_type IN ('Deposit', 'SpecialAssessment')
                                    AND r.reference_id = cu.id
        LEFT JOIN invoices inv ON r.reconciliation_type = 'Invoice'
                                  AND r.reference_id = inv.id
        WHERE bt.id = %s
        """
        if active_only:
            query += " AND bt.is_active = 1"

        cursor.execute(query, (transaction_id,))

        return cursor.fetchone()

    def get_by_statement_id(
        self,
        statement_id: int,
        type_filter: Optional[str] = None,
        reconciled: Optional[bool] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["bt.bank_statement_id = %s", "bt.is_active = %s"]
        params: list[Any] = [statement_id, int(is_active)]

        if type_filter:
            where.append("bt.type = %s")
            params.append(type_filter)
        if reconciled is not None:
            where.append("bt.reconciled = %s")
            params.append(int(reconciled))

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} bt WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        query = f"""
        SELECT bt.*,
               r.id as reconciliation_id,
               r.reconciliation_type,
               r.status as reconciliation_status,
               r.match_score,
               r.payment_status,
               CASE
                   WHEN r.reconciliation_type = 'Deposit' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                   WHEN r.reconciliation_type = 'SpecialAssessment' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('Special Assessment - Unit ', cu.unit_number)
                   WHEN r.reconciliation_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                       THEN inv.invoice_number
                   WHEN r.reconciliation_type = 'BankFee'
                       THEN 'Bank Fee'
                   WHEN r.reconciliation_type = 'Interest'
                       THEN 'Interest Credit'
                   ELSE NULL
               END as matched_record_name
        FROM {TABLE_NAME} bt
        LEFT JOIN reconciliation_records r ON bt.id = r.bank_transaction_id AND r.is_active = 1
        LEFT JOIN condo_units cu ON r.reconciliation_type IN ('Deposit', 'SpecialAssessment')
                                    AND r.reference_id = cu.id
        LEFT JOIN invoices inv ON r.reconciliation_type = 'Invoice'
                                  AND r.reference_id = inv.id
        WHERE {where_clause}
        ORDER BY bt.transaction_date ASC, bt.id ASC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def get_summary(self, statement_id: int) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END), 0) as total_credits,
                COALESCE(SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END), 0) as total_debits,
                SUM(CASE WHEN type = 'Credit' THEN 1 ELSE 0 END) as credit_count,
                SUM(CASE WHEN type = 'Debit' THEN 1 ELSE 0 END) as debit_count,
                SUM(CASE WHEN reconciled = 1 THEN 1 ELSE 0 END) as reconciled_count,
                SUM(CASE WHEN reconciled = 0 THEN 1 ELSE 0 END) as unreconciled_count
            FROM {TABLE_NAME}
            WHERE bank_statement_id = %s AND is_active = 1
            """,
            (statement_id,),
        )
        row = cursor.fetchone()

        return {
            "total_transactions": row["total_transactions"],
            "total_credits": float(row["total_credits"]),
            "total_debits": float(row["total_debits"]),
            "net_balance": float(row["total_credits"]) - float(row["total_debits"]),
            "credit_count": row["credit_count"],
            "debit_count": row["debit_count"],
            "reconciled_count": row["reconciled_count"],
            "unreconciled_count": row["unreconciled_count"],
        }
