from datetime import datetime
from typing import Any, Optional

from .model import TABLE_NAME


class ReconciliationRepository:

    def __init__(self, db):
        self.db = db

    # ── Bank Transaction Queries ──────────────────────────────────────

    def get_bank_transaction(self, transaction_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM bank_transactions WHERE id = %s AND is_active = 1",
            (transaction_id,),
        )

        return cursor.fetchone()

    def get_unreconciled_transactions(self, statement_id: int) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT * FROM bank_transactions
            WHERE bank_statement_id = %s
              AND reconciled = 0
              AND is_active = 1
            ORDER BY transaction_date ASC
            """,
            (statement_id,),
        )

        return cursor.fetchall()

    def mark_transaction_reconciled(self, transaction_id: int) -> None:
        cursor = self.db.cursor()

        cursor.execute(
            """
            UPDATE bank_transactions
            SET reconciled = 1, version = version + 1
            WHERE id = %s
            """,
            (transaction_id,),
        )

        self.db.commit()

    # ── Candidate Business Records ────────────────────────────────────

    def get_pending_invoices(self) -> list[dict]:
        """Get all active invoices for reconciliation matching (regardless of payment status)."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT i.*, v.name as vendor_name
            FROM invoices i
            LEFT JOIN vendors v ON i.vendor_id = v.id
            WHERE i.is_active = 1
            ORDER BY i.due_date ASC
            """
        )

        results = cursor.fetchall()
        return results

    def get_all_units(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT * FROM condo_units
            WHERE is_active = 1
            ORDER BY unit_number ASC
            """
        )

        return cursor.fetchall()

    def get_all_vendors(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM vendors WHERE is_active = 1 ORDER BY name ASC"
        )

        return cursor.fetchall()

    def get_outstanding_assessments(self) -> list[dict]:
        """Get all unpaid/active special assessments for reconciliation matching."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT sa.id, sa.unit_id, sa.title, sa.description, sa.amount, sa.due_date, sa.status,
                   cu.unit_number, cu.owner_name
            FROM special_assessments sa
            JOIN condo_units cu ON sa.unit_id = cu.id
            WHERE sa.status IN ('Active', 'Pending')
            ORDER BY sa.due_date ASC, cu.unit_number ASC
            """
        )

        return cursor.fetchall()

    def update_special_assessment_status(self, assessment_id: int, status: str, paid_at=None) -> None:
        """Update the status of a special_assessments row (e.g., Active → Paid)."""
        cursor = self.db.cursor()

        if paid_at:
            cursor.execute(
                "UPDATE special_assessments SET status = %s, updated_at = %s WHERE id = %s",
                (status, paid_at, assessment_id),
            )
        else:
            cursor.execute(
                "UPDATE special_assessments SET status = %s, updated_at = NOW() WHERE id = %s",
                (status, assessment_id),
            )

        self.db.commit()

    def get_deposit_for_unit_month(self, unit_id: int, month: int, year: int) -> Optional[dict]:
        """Check if a unit already has a matched deposit for a given month/year."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT r.id, r.bank_transaction_id, bt.transaction_date, bt.amount
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            WHERE r.reconciliation_type = 'Deposit'
              AND r.reference_id = %s
              AND r.is_active = 1
              AND r.status IN ('Matched', 'Resolved')
              AND MONTH(bt.transaction_date) = %s
              AND YEAR(bt.transaction_date) = %s
            LIMIT 1
            """,
            (unit_id, month, year),
        )

        return cursor.fetchone()

    # ── Reconciliation Record CRUD ────────────────────────────────────

    def get_by_transaction_id(self, transaction_id: int) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"SELECT * FROM {TABLE_NAME} WHERE bank_transaction_id = %s AND is_active = 1",
            (transaction_id,),
        )

        return cursor.fetchone()

    def get_all_by_transaction_id(self, transaction_id: int) -> list[dict]:
        """Get ALL reconciliation records for a bank transaction with enriched matched record details."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT r.*,
                   CASE
                       WHEN r.reconciliation_type = 'Deposit' AND cu.unit_number IS NOT NULL
                           THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                       WHEN r.reconciliation_type = 'SpecialAssessment' AND sa.title IS NOT NULL
                           THEN CONCAT(sa.title, ' - Unit ', sa_cu.unit_number)
                       WHEN r.reconciliation_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                           THEN inv.invoice_number
                       WHEN r.reconciliation_type = 'BankFee'
                           THEN 'Bank Fee'
                       WHEN r.reconciliation_type = 'Interest'
                           THEN 'Interest Credit'
                       ELSE NULL
                   END as matched_record_name,
                   CASE
                       WHEN r.reconciliation_type = 'Invoice' THEN inv.amount
                       WHEN r.reconciliation_type = 'Deposit' THEN cu.monthly_hoa_amount
                       WHEN r.reconciliation_type = 'SpecialAssessment' THEN sa.amount
                       ELSE NULL
                   END as matched_amount,
                   CASE
                       WHEN r.reconciliation_type = 'Invoice' THEN inv.status
                       WHEN r.reconciliation_type IN ('Deposit', 'SpecialAssessment') THEN r.payment_status
                       ELSE NULL
                   END as matched_status,
                   COALESCE(cu.unit_number, sa_cu.unit_number) as unit_number,
                   COALESCE(cu.owner_name, sa_cu.owner_name) as owner_name
            FROM {TABLE_NAME} r
            LEFT JOIN condo_units cu ON r.reconciliation_type = 'Deposit'
                                        AND r.reference_id = cu.id
            LEFT JOIN special_assessments sa ON r.reconciliation_type = 'SpecialAssessment'
                                               AND r.reference_id = sa.id
            LEFT JOIN condo_units sa_cu ON sa.unit_id = sa_cu.id
            LEFT JOIN invoices inv ON r.reconciliation_type = 'Invoice'
                                      AND r.reference_id = inv.id
            WHERE r.bank_transaction_id = %s 
              AND r.is_active = 1
              AND (
                  r.reconciliation_type != 'Invoice' 
                  OR (r.reconciliation_type = 'Invoice' AND r.reference_id IS NOT NULL)
              )
            ORDER BY r.created_at DESC
            """,
            (transaction_id,),
        )

        return cursor.fetchall()

    def create_reconciliation(
        self,
        bank_transaction_id: int,
        reconciliation_type: str,
        reference_id: Optional[int],
        payment_status: str,
        match_score: float,
        status: str,
        resolution_notes: Optional[str] = None,
        matched_by: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> int:
        cursor = self.db.cursor()

        query = f"""
        INSERT INTO {TABLE_NAME}
        (
            bank_transaction_id, reconciliation_type, reference_id,
            payment_status, match_score, status, resolution_notes,
            matched_by, matched_date, created_by, updated_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                bank_transaction_id,
                reconciliation_type,
                reference_id,
                payment_status,
                match_score,
                status,
                resolution_notes,
                matched_by,
                datetime.utcnow(),
                created_by,
                created_by,
            ),
        )

        self.db.commit()

        return cursor.lastrowid

    def get_by_id(self, record_id: int, active_only: bool = True) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT r.*,
               bt.description as transaction_description,
               bt.amount as transaction_amount,
               bt.type as transaction_type,
               bt.transaction_date
        FROM {TABLE_NAME} r
        JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
        WHERE r.id = %s
        """
        if active_only:
            query += " AND r.is_active = 1"

        cursor.execute(query, (record_id,))
        row = cursor.fetchone()

        if not row:
            return None

        # Enrich with matched record details based on type
        if row["reconciliation_type"] == "Deposit" and row.get("reference_id"):
            cursor.execute(
                "SELECT unit_number, owner_name, monthly_hoa_amount FROM condo_units WHERE id = %s",
                (row["reference_id"],),
            )
            unit = cursor.fetchone()
            if unit:
                row["unit_number"] = unit["unit_number"]
                row["owner_name"] = unit["owner_name"]
                row["matched_record_name"] = f"HOA Deposit - Unit {unit['unit_number']}"
                row["matched_record_description"] = unit["owner_name"]

        elif row["reconciliation_type"] == "SpecialAssessment" and row.get("reference_id"):
            cursor.execute(
                "SELECT unit_number, owner_name FROM condo_units WHERE id = %s",
                (row["reference_id"],),
            )
            unit = cursor.fetchone()
            if unit:
                row["unit_number"] = unit["unit_number"]
                row["owner_name"] = unit["owner_name"]
                row["matched_record_name"] = f"Special Assessment - Unit {unit['unit_number']}"
                row["matched_record_description"] = unit["owner_name"]

        elif row["reconciliation_type"] == "Invoice" and row.get("reference_id"):
            cursor.execute(
                """
                SELECT i.invoice_number, i.amount as invoice_amount, i.due_date,
                       v.name as vendor_name
                FROM invoices i
                LEFT JOIN vendors v ON i.vendor_id = v.id
                WHERE i.id = %s
                """,
                (row["reference_id"],),
            )
            inv = cursor.fetchone()
            if inv:
                row["invoice_number"] = inv["invoice_number"]
                row["vendor_name"] = inv["vendor_name"]
                row["matched_record_name"] = inv["invoice_number"]
                row["matched_record_description"] = inv["vendor_name"]

        elif row["reconciliation_type"] == "BankFee":
            row["matched_record_name"] = "Bank Fee"
            row["matched_record_description"] = "Auto-classified bank fee"

        elif row["reconciliation_type"] == "Interest":
            row["matched_record_name"] = "Interest Credit"
            row["matched_record_description"] = "Auto-classified interest"

        else:
            row["matched_record_name"] = "No Match"
            row["matched_record_description"] = "Manual review required"

        return row

    def get_filtered(
        self,
        bank_statement_id: Optional[int] = None,
        bank_statement_ids: Optional[list[int]] = None,
        reconciliation_type: Optional[str] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        is_active: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = ["r.is_active = %s"]
        params: list[Any] = [int(is_active)]

        # Support both single and multiple statement IDs
        effective_ids = bank_statement_ids or ([bank_statement_id] if bank_statement_id is not None else None)
        if effective_ids is not None:
            placeholders = ", ".join(["%s"] * len(effective_ids))
            where.append(
                f"r.bank_transaction_id IN "
                f"(SELECT id FROM bank_transactions WHERE bank_statement_id IN ({placeholders}))"
            )
            params.extend(effective_ids)
        if reconciliation_type:
            where.append("r.reconciliation_type = %s")
            params.append(reconciliation_type)
        if status:
            where.append("r.status = %s")
            params.append(status)
        if payment_status:
            where.append("r.payment_status = %s")
            params.append(payment_status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} r WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        query = f"""
        SELECT r.*, bt.description as transaction_description,
               bt.amount as transaction_amount, bt.type as transaction_type,
               bt.transaction_date,
               COALESCE(cu.unit_number, sa_cu.unit_number) as unit_number,
               COALESCE(cu.owner_name, sa_cu.owner_name) as owner_name,
               cu.monthly_hoa_amount,
               inv.invoice_number, v.name as vendor_name,
               sa.title as assessment_title, sa.amount as assessment_amount,
               CASE
                   WHEN r.reconciliation_type = 'Deposit' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                   WHEN r.reconciliation_type = 'SpecialAssessment' AND sa.title IS NOT NULL
                       THEN CONCAT(sa.title, ' - Unit ', sa_cu.unit_number)
                   WHEN r.reconciliation_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                       THEN inv.invoice_number
                   WHEN r.reconciliation_type = 'BankFee'
                       THEN 'Bank Fee'
                   WHEN r.reconciliation_type = 'Interest'
                       THEN 'Interest Credit'
                   ELSE 'No Match'
               END as matched_record_name,
               CASE
                   WHEN r.reconciliation_type = 'Deposit' AND cu.owner_name IS NOT NULL
                       THEN cu.owner_name
                   WHEN r.reconciliation_type = 'SpecialAssessment' AND sa_cu.owner_name IS NOT NULL
                       THEN sa_cu.owner_name
                   WHEN r.reconciliation_type = 'Invoice' AND v.name IS NOT NULL
                       THEN v.name
                   WHEN r.reconciliation_type = 'BankFee'
                       THEN 'Auto-classified bank fee'
                   WHEN r.reconciliation_type = 'Interest'
                       THEN 'Auto-classified interest'
                   ELSE 'Manual review required'
               END as matched_record_description
        FROM {TABLE_NAME} r
        JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
        LEFT JOIN condo_units cu ON r.reconciliation_type = 'Deposit'
                                    AND r.reference_id = cu.id
        LEFT JOIN special_assessments sa ON r.reconciliation_type = 'SpecialAssessment'
                                           AND r.reference_id = sa.id
        LEFT JOIN condo_units sa_cu ON sa.unit_id = sa_cu.id
        LEFT JOIN invoices inv ON r.reconciliation_type = 'Invoice'
                                  AND r.reference_id = inv.id
        LEFT JOIN vendors v ON inv.vendor_id = v.id
        WHERE {where_clause}
        ORDER BY r.created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        return rows, total

    def get_summary(self, bank_statement_id: Optional[int] = None) -> dict:
        cursor = self.db.cursor(dictionary=True)

        # Transaction counts
        txn_where = "is_active = 1"
        txn_params: list = []
        if bank_statement_id is not None:
            txn_where += " AND bank_statement_id = %s"
            txn_params.append(bank_statement_id)

        cursor.execute(
            f"""
            SELECT
                COUNT(*) as total_transactions,
                SUM(CASE WHEN reconciled = 1 THEN 1 ELSE 0 END) as reconciled_count,
                SUM(CASE WHEN reconciled = 0 THEN 1 ELSE 0 END) as unreconciled_count,
                COALESCE(SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END), 0) as total_credits,
                COALESCE(SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END), 0) as total_debits
            FROM bank_transactions
            WHERE {txn_where}
            """,
            txn_params,
        )
        txn_summary = cursor.fetchone()

        # Reconciliation record counts
        recon_where = "r.is_active = 1"
        recon_params: list = []
        if bank_statement_id is not None:
            recon_where += " AND r.bank_transaction_id IN (SELECT id FROM bank_transactions WHERE bank_statement_id = %s)"
            recon_params.append(bank_statement_id)

        cursor.execute(
            f"""
            SELECT
                SUM(CASE WHEN r.status = 'Matched' THEN 1 ELSE 0 END) as matched_count,
                SUM(CASE WHEN r.status = 'NeedsReview' THEN 1 ELSE 0 END) as needs_review_count,
                SUM(CASE WHEN r.status = 'Unresolved' THEN 1 ELSE 0 END) as unresolved_count,
                SUM(CASE WHEN r.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count
            FROM {TABLE_NAME} r
            WHERE {recon_where}
            """,
            recon_params,
        )
        recon_summary = cursor.fetchone()

        return {
            "total_transactions": txn_summary["total_transactions"],
            "reconciled_count": txn_summary["reconciled_count"],
            "unreconciled_count": txn_summary["unreconciled_count"],
            "total_credits": float(txn_summary["total_credits"]),
            "total_debits": float(txn_summary["total_debits"]),
            "bank_balance": float(txn_summary["total_credits"]) - float(txn_summary["total_debits"]),
            "matched_count": recon_summary["matched_count"] or 0,
            "needs_review_count": recon_summary["needs_review_count"] or 0,
            "unresolved_count": recon_summary["unresolved_count"] or 0,
            "resolved_count": recon_summary["resolved_count"] or 0,
        }

    def update_reconciliation(self, record_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(record_id, active_only=False)

        cursor = self.db.cursor()

        columns = list(data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in data.values()]

        set_clauses = [f"{col} = %s" for col in columns]
        set_clauses.append("updated_by = %s")
        set_clauses.append("version = version + 1")

        params = values + [updated_by, record_id]

        query = f"""
        UPDATE {TABLE_NAME}
        SET {", ".join(set_clauses)}
        WHERE id = %s
        """

        cursor.execute(query, params)
        self.db.commit()

        return self.get_by_id(record_id, active_only=False)

    # ── Business Record Status Updates ────────────────────────────────

    def update_invoice_status(self, invoice_id: int, status: str, paid_at=None) -> None:
        cursor = self.db.cursor()

        if paid_at:
            cursor.execute(
                "UPDATE invoices SET status = %s, paid_at = %s, version = version + 1 WHERE id = %s",
                (status, paid_at, invoice_id),
            )
        else:
            cursor.execute(
                "UPDATE invoices SET status = %s, version = version + 1 WHERE id = %s",
                (status, invoice_id),
            )

        self.db.commit()

    # ── Deposit Queries (from reconciliation_records) ─────────────────

    def get_deposit_records(
        self,
        unit_id: Optional[int] = None,
        deposit_month: Optional[int] = None,
        deposit_year: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = [
            "r.reconciliation_type = 'Deposit'",
            "r.is_active = 1",
        ]
        params: list[Any] = []

        if unit_id is not None:
            where.append("r.reference_id = %s")
            params.append(unit_id)
        if deposit_month is not None:
            where.append("MONTH(bt.transaction_date) = %s")
            params.append(deposit_month)
        if deposit_year is not None:
            where.append("YEAR(bt.transaction_date) = %s")
            params.append(deposit_year)
        if status:
            where.append("r.status = %s")
            params.append(status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"""
            SELECT COUNT(*) as total
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            WHERE {where_clause}
            """,
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT r.*, 
                   bt.transaction_date, 
                   bt.amount as transaction_amount,
                   bt.description as transaction_description,
                   cu.unit_number, 
                   cu.owner_name, 
                   cu.monthly_hoa_amount,
                   (cu.monthly_hoa_amount - bt.amount) as balance
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            LEFT JOIN condo_units cu ON r.reference_id = cu.id
            WHERE {where_clause}
            ORDER BY bt.transaction_date DESC
            LIMIT %s OFFSET %s
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        return rows, total

    def get_deposit_summary(
        self,
        deposit_month: Optional[int] = None,
        deposit_year: Optional[int] = None,
    ) -> dict:
        cursor = self.db.cursor(dictionary=True)

        # Total expected = all active units * monthly_hoa_amount (per month)
        cursor.execute(
            "SELECT COUNT(*) as total_units, COALESCE(SUM(monthly_hoa_amount), 0) as total_expected FROM condo_units WHERE is_active = 1 AND status = 'Active'"
        )
        unit_stats = cursor.fetchone()

        # Total received for the given month/year
        rec_conditions = [
            "r.reconciliation_type = 'Deposit'",
            "r.is_active = 1",
        ]
        params: list[Any] = []

        if deposit_month is not None:
            rec_conditions.append("MONTH(bt.transaction_date) = %s")
            params.append(deposit_month)
        if deposit_year is not None:
            rec_conditions.append("YEAR(bt.transaction_date) = %s")
            params.append(deposit_year)

        rec_clause = " AND ".join(rec_conditions)

        cursor.execute(
            f"""
            SELECT
                COUNT(DISTINCT r.reference_id) as paid_units,
                COALESCE(SUM(bt.amount), 0) as total_received
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            WHERE {rec_clause}
            """,
            params,
        )
        deposit_stats = cursor.fetchone()

        total_expected = float(unit_stats["total_expected"])
        total_received = float(deposit_stats["total_received"])
        paid_units = deposit_stats["paid_units"] or 0
        total_units = unit_stats["total_units"]
        outstanding_units = total_units - paid_units

        return {
            "total_units": total_units,
            "total_expected": total_expected,
            "total_received": total_received,
            "outstanding_balance": total_expected - total_received,
            "paid_units": paid_units,
            "outstanding_units": outstanding_units,
        }

    # ── Special Assessment Queries (from reconciliation_records) ──────

    def get_assessment_records(
        self,
        unit_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = [
            "r.reconciliation_type = 'SpecialAssessment'",
            "r.is_active = 1",
        ]
        params: list[Any] = []

        if unit_id is not None:
            where.append("r.reference_id = %s")
            params.append(unit_id)
        if status:
            where.append("r.status = %s")
            params.append(status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} r WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT r.*, bt.transaction_date, bt.amount as transaction_amount,
                   bt.description as transaction_description,
                   sa.title as assessment_title, sa.amount as assessment_amount,
                   sa_cu.unit_number, sa_cu.owner_name
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            LEFT JOIN special_assessments sa ON r.reference_id = sa.id
            LEFT JOIN condo_units sa_cu ON sa.unit_id = sa_cu.id
            WHERE {where_clause}
            ORDER BY bt.transaction_date DESC
            LIMIT %s OFFSET %s
            """,
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        return rows, total

    def get_assessment_summary(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                COUNT(*) as total_assessments,
                COALESCE(SUM(bt.amount), 0) as total_collected,
                SUM(CASE WHEN r.status = 'Matched' THEN 1 ELSE 0 END) as matched_count,
                SUM(CASE WHEN r.status = 'NeedsReview' THEN 1 ELSE 0 END) as needs_review_count
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            WHERE r.reconciliation_type = 'SpecialAssessment'
              AND r.is_active = 1
            """
        )

        return cursor.fetchone()
