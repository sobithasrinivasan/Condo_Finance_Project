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
        """Get all active invoices for reconciliation matching."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT i.*, v.vendor_name
            FROM invoices i
            LEFT JOIN vendors v ON i.vendor_id = v.id
            WHERE i.is_active = 1
            ORDER BY i.due_date ASC
            """
        )

        return cursor.fetchall()

    def get_pending_payables(self) -> list[dict]:
        """Get all pending payables for reconciliation matching (debit transactions)."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT p.*, v.vendor_name
            FROM payables p
            LEFT JOIN vendors v ON p.vendor_id = v.id
            WHERE p.status = 'Pending' AND p.is_active = 1
            ORDER BY p.due_date ASC
            """
        )

        return cursor.fetchall()

    def get_pending_receivables(self) -> list[dict]:
        """Get all pending receivables for reconciliation matching (credit transactions)."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT r.*, cu.unit_number, cu.owner_name
            FROM receivables r
            LEFT JOIN condo_units cu ON r.unit_id = cu.id
            WHERE r.status = 'Pending' AND r.is_active = 1
            ORDER BY r.due_date ASC
            """
        )

        return cursor.fetchall()

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
            "SELECT * FROM vendors WHERE is_active = 1 ORDER BY vendor_name ASC"
        )

        return cursor.fetchall()

    def get_outstanding_assessments(self) -> list[dict]:
        """Get all unpaid/active assessment allocations for reconciliation matching."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT aa.id, aa.assessment_id, aa.unit_id, aa.allocated_amount, 
                   aa.paid_amount, aa.status,
                   sa.title, sa.description, sa.due_date,
                   cu.unit_number, cu.owner_name
            FROM assessment_allocations aa
            JOIN special_assessments sa ON aa.assessment_id = sa.id
            JOIN condo_units cu ON aa.unit_id = cu.id
            WHERE aa.status IN ('Pending', 'Partial')
              AND sa.status IN ('Active', 'Upcoming')
            ORDER BY sa.due_date ASC, cu.unit_number ASC
            """
        )

        return cursor.fetchall()

    def update_assessment_allocation_status(self, allocation_id: int, status: str, paid_amount=None) -> None:
        """Update the status of an assessment_allocation row (e.g., Pending → Paid)."""
        cursor = self.db.cursor()

        if paid_amount is not None:
            cursor.execute(
                "UPDATE assessment_allocations SET status = %s, paid_amount = %s, updated_at = NOW() WHERE id = %s",
                (status, paid_amount, allocation_id),
            )
        else:
            cursor.execute(
                "UPDATE assessment_allocations SET status = %s, updated_at = NOW() WHERE id = %s",
                (status, allocation_id),
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
            WHERE r.record_type = 'Deposit'
              AND r.record_id = %s
              AND r.is_active = 1
              AND r.status = 'Matched'
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
                   r.record_type as reconciliation_type,
                   r.record_id as reference_id,
                   r.notes as resolution_notes,
                   r.matched_at as matched_date,
                   CASE
                       WHEN r.record_type = 'Deposit' AND cu.unit_number IS NOT NULL
                           THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                       WHEN r.record_type = 'Receivable' AND cu2.unit_number IS NOT NULL
                           THEN CONCAT('Receivable - Unit ', cu2.unit_number)
                       WHEN r.record_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                           THEN inv.invoice_number
                       WHEN r.record_type = 'Payable' AND v2.vendor_name IS NOT NULL
                           THEN CONCAT('Payable - ', v2.vendor_name)
                       WHEN r.record_type = 'Manual'
                           THEN 'Manual Match'
                       ELSE NULL
                   END as matched_record_name,
                   CASE
                       WHEN r.record_type = 'Invoice' THEN inv.amount
                       WHEN r.record_type = 'Deposit' THEN cu.monthly_hoa_amount
                       WHEN r.record_type = 'Receivable' THEN rec.amount
                       WHEN r.record_type = 'Payable' THEN pay.amount
                       ELSE NULL
                   END as matched_amount,
                   COALESCE(cu.unit_number, cu2.unit_number) as unit_number,
                   COALESCE(cu.owner_name, cu2.owner_name) as owner_name
            FROM {TABLE_NAME} r
            LEFT JOIN condo_units cu ON r.record_type = 'Deposit'
                                        AND r.record_id = cu.id
            LEFT JOIN receivables rec ON r.record_type = 'Receivable'
                                         AND r.record_id = rec.id
            LEFT JOIN condo_units cu2 ON rec.unit_id = cu2.id
            LEFT JOIN payables pay ON r.record_type = 'Payable'
                                      AND r.record_id = pay.id
            LEFT JOIN vendors v2 ON pay.vendor_id = v2.id
            LEFT JOIN invoices inv ON r.record_type = 'Invoice'
                                      AND r.record_id = inv.id
            WHERE r.bank_transaction_id = %s 
              AND r.is_active = 1
            ORDER BY r.created_at DESC
            """,
            (transaction_id,),
        )

        return cursor.fetchall()

    def create_reconciliation(
        self,
        association_id: int,
        bank_transaction_id: int,
        record_type: str,
        record_id: Optional[int],
        status: str,
        method: str,
        match_score: Optional[float] = None,
        notes: Optional[str] = None,
        matched_by: Optional[int] = None,
        created_by: Optional[int] = None,
    ) -> int:
        cursor = self.db.cursor()

        # Include match_score in notes if provided
        final_notes = notes or ""
        if match_score is not None:
            score_info = f"[Score: {match_score}]"
            final_notes = f"{score_info} {final_notes}".strip() if final_notes else score_info

        query = f"""
        INSERT INTO {TABLE_NAME}
        (
            association_id, bank_transaction_id, record_type, record_id,
            status, method, notes, matched_by, matched_at, created_by, updated_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                association_id,
                bank_transaction_id,
                record_type,
                record_id,
                status,
                method,
                final_notes if final_notes else None,
                matched_by,
                datetime.utcnow() if status == "Matched" else None,
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
               r.record_type as reconciliation_type,
               r.record_id as reference_id,
               r.notes as resolution_notes,
               r.matched_at as matched_date,
               bt.description as transaction_description,
               bt.amount as transaction_amount,
               bt.transaction_type,
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

        # Extract match_score from notes if present
        if row.get("resolution_notes") and "[Score:" in row["resolution_notes"]:
            import re
            score_match = re.search(r'\[Score:\s*([\d.]+)\]', row["resolution_notes"])
            if score_match:
                row["match_score"] = float(score_match.group(1))
            else:
                row["match_score"] = None
        else:
            row["match_score"] = None

        # Derive payment_status from matched record status
        row["payment_status"] = None

        # Enrich with matched record details based on type
        if row["record_type"] == "Deposit" and row.get("record_id"):
            cursor.execute(
                "SELECT unit_number, owner_name, monthly_hoa_amount FROM condo_units WHERE id = %s",
                (row["record_id"],),
            )
            unit = cursor.fetchone()
            if unit:
                row["unit_number"] = unit["unit_number"]
                row["owner_name"] = unit["owner_name"]
                row["matched_record_name"] = f"HOA Deposit - Unit {unit['unit_number']}"
                row["matched_record_description"] = unit["owner_name"]

        elif row["record_type"] == "Receivable" and row.get("record_id"):
            cursor.execute(
                """
                SELECT r2.amount, r2.status, cu.unit_number, cu.owner_name
                FROM receivables r2
                LEFT JOIN condo_units cu ON r2.unit_id = cu.id
                WHERE r2.id = %s
                """,
                (row["record_id"],),
            )
            rec = cursor.fetchone()
            if rec:
                row["unit_number"] = rec["unit_number"]
                row["owner_name"] = rec["owner_name"]
                row["matched_record_name"] = f"Receivable - Unit {rec['unit_number']}"
                row["matched_record_description"] = rec["owner_name"]
                row["payment_status"] = rec["status"]

        elif row["record_type"] == "Payable" and row.get("record_id"):
            cursor.execute(
                """
                SELECT p.amount, p.status, p.description, v.vendor_name
                FROM payables p
                LEFT JOIN vendors v ON p.vendor_id = v.id
                WHERE p.id = %s
                """,
                (row["record_id"],),
            )
            pay = cursor.fetchone()
            if pay:
                row["vendor_name"] = pay["vendor_name"]
                row["matched_record_name"] = f"Payable - {pay['vendor_name'] or 'Unknown'}"
                row["matched_record_description"] = pay["description"]
                row["payment_status"] = pay["status"]

        elif row["record_type"] == "Invoice" and row.get("record_id"):
            cursor.execute(
                """
                SELECT i.invoice_number, i.amount as invoice_amount, i.due_date, i.status,
                       v.vendor_name
                FROM invoices i
                LEFT JOIN vendors v ON i.vendor_id = v.id
                WHERE i.id = %s
                """,
                (row["record_id"],),
            )
            inv = cursor.fetchone()
            if inv:
                row["invoice_number"] = inv["invoice_number"]
                row["vendor_name"] = inv["vendor_name"]
                row["matched_record_name"] = inv["invoice_number"]
                row["matched_record_description"] = inv["vendor_name"]
                row["payment_status"] = inv["status"]

        elif row["record_type"] == "Manual":
            row["matched_record_name"] = "Manual Match"
            row["matched_record_description"] = "Manually matched"

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
            where.append("r.record_type = %s")
            params.append(reconciliation_type)
        if status:
            where.append("r.status = %s")
            params.append(status)
        # payment_status filter - not a DB column anymore, skip for now

        where_clause = " AND ".join(where)

        cursor.execute(
            f"SELECT COUNT(*) as total FROM {TABLE_NAME} r WHERE {where_clause}",
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        query = f"""
        SELECT r.*,
               r.record_type as reconciliation_type,
               r.record_id as reference_id,
               r.notes as resolution_notes,
               r.matched_at as matched_date,
               bt.description as transaction_description,
               bt.amount as transaction_amount, bt.transaction_type,
               bt.transaction_date,
               COALESCE(cu.unit_number, cu2.unit_number) as unit_number,
               COALESCE(cu.owner_name, cu2.owner_name) as owner_name,
               cu.monthly_hoa_amount,
               inv.invoice_number, v.vendor_name,
               sa.title as assessment_title,
               CASE
                   WHEN r.record_type = 'Deposit' AND cu.unit_number IS NOT NULL
                       THEN CONCAT('HOA Deposit - Unit ', cu.unit_number)
                   WHEN r.record_type = 'Receivable' AND cu2.unit_number IS NOT NULL
                       THEN CONCAT('Receivable - Unit ', cu2.unit_number)
                   WHEN r.record_type = 'Invoice' AND inv.invoice_number IS NOT NULL
                       THEN inv.invoice_number
                   WHEN r.record_type = 'Payable' AND v2.vendor_name IS NOT NULL
                       THEN CONCAT('Payable - ', v2.vendor_name)
                   WHEN r.record_type = 'Manual'
                       THEN 'Manual Match'
                   ELSE 'No Match'
               END as matched_record_name,
               CASE
                   WHEN r.record_type = 'Deposit' AND cu.owner_name IS NOT NULL
                       THEN cu.owner_name
                   WHEN r.record_type = 'Receivable' AND cu2.owner_name IS NOT NULL
                       THEN cu2.owner_name
                   WHEN r.record_type = 'Invoice' AND v.vendor_name IS NOT NULL
                       THEN v.vendor_name
                   WHEN r.record_type = 'Payable' AND v2.vendor_name IS NOT NULL
                       THEN v2.vendor_name
                   WHEN r.record_type = 'Manual'
                       THEN 'Manually matched'
                   ELSE 'Manual review required'
               END as matched_record_description
        FROM {TABLE_NAME} r
        JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
        LEFT JOIN condo_units cu ON r.record_type = 'Deposit'
                                    AND r.record_id = cu.id
        LEFT JOIN receivables rec ON r.record_type = 'Receivable'
                                     AND r.record_id = rec.id
        LEFT JOIN condo_units cu2 ON rec.unit_id = cu2.id
        LEFT JOIN payables pay ON r.record_type = 'Payable'
                                  AND r.record_id = pay.id
        LEFT JOIN vendors v2 ON pay.vendor_id = v2.id
        LEFT JOIN invoices inv ON r.record_type = 'Invoice'
                                  AND r.record_id = inv.id
        LEFT JOIN vendors v ON inv.vendor_id = v.id
        LEFT JOIN special_assessments sa ON r.record_type = 'Receivable'
                                           AND rec.assessment_id = sa.id
        WHERE {where_clause}
        ORDER BY r.created_at DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, params + [page_size, offset])
        rows = cursor.fetchall()

        # Extract match_score from notes for each row
        import re
        for row in rows:
            if row.get("resolution_notes") and "[Score:" in row["resolution_notes"]:
                score_match = re.search(r'\[Score:\s*([\d.]+)\]', row["resolution_notes"])
                row["match_score"] = float(score_match.group(1)) if score_match else None
            else:
                row["match_score"] = None
            row["payment_status"] = None

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
                COALESCE(SUM(CASE WHEN transaction_type = 'Deposit' THEN amount
                                  WHEN transaction_type = 'ACH' AND amount > 0 THEN amount
                                  ELSE 0 END), 0) as total_credits,
                COALESCE(SUM(CASE WHEN transaction_type IN ('Cheque', 'Debit') THEN ABS(amount)
                                  WHEN transaction_type = 'ACH' AND amount < 0 THEN ABS(amount)
                                  ELSE 0 END), 0) as total_debits
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
                SUM(CASE WHEN r.status = 'Suggested' THEN 1 ELSE 0 END) as needs_review_count,
                SUM(CASE WHEN r.status = 'Unmatched' THEN 1 ELSE 0 END) as unresolved_count
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
            "resolved_count": 0,  # kept for response compatibility
        }

    def update_reconciliation(self, record_id: int, data: dict, updated_by: Optional[int] = None) -> Optional[dict]:
        if not data:
            return self.get_by_id(record_id, active_only=False)

        cursor = self.db.cursor()

        # Map old field names to new DB columns
        field_map = {
            "reconciliation_type": "record_type",
            "reference_id": "record_id",
            "resolution_notes": "notes",
        }

        mapped_data = {}
        for key, value in data.items():
            db_col = field_map.get(key, key)
            mapped_data[db_col] = value

        columns = list(mapped_data.keys())
        values = [int(v) if isinstance(v, bool) else v for v in mapped_data.values()]

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

    def update_invoice_status(self, invoice_id: int, status: str) -> None:
        cursor = self.db.cursor()

        cursor.execute(
            "UPDATE invoices SET status = %s, version = version + 1 WHERE id = %s",
            (status, invoice_id),
        )

        self.db.commit()

    def update_payable_status(self, payable_id: int, status: str) -> None:
        """Update payable status (e.g., Pending → Paid)."""
        cursor = self.db.cursor()

        cursor.execute(
            "UPDATE payables SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, payable_id),
        )

        self.db.commit()

    def update_receivable_status(self, receivable_id: int, status: str) -> None:
        """Update receivable status (e.g., Pending → Paid)."""
        cursor = self.db.cursor()

        cursor.execute(
            "UPDATE receivables SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, receivable_id),
        )

        self.db.commit()

    # ── Deposit Queries (from reconciliations) ─────────────────────────

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
            "r.record_type = 'Deposit'",
            "r.is_active = 1",
        ]
        params: list[Any] = []

        if unit_id is not None:
            where.append("r.record_id = %s")
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
                   r.record_type as reconciliation_type,
                   r.record_id as reference_id,
                   r.notes as resolution_notes,
                   r.matched_at as matched_date,
                   bt.transaction_date, 
                   bt.amount as transaction_amount,
                   bt.description as transaction_description,
                   cu.unit_number, 
                   cu.owner_name, 
                   cu.monthly_hoa_amount,
                   (cu.monthly_hoa_amount - bt.amount) as balance
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            LEFT JOIN condo_units cu ON r.record_id = cu.id
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
            "r.record_type = 'Deposit'",
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
                COUNT(DISTINCT r.record_id) as paid_units,
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

    # ── Assessment Queries (from reconciliations) ─────────────────────

    def get_assessment_records(
        self,
        unit_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        cursor = self.db.cursor(dictionary=True)

        where: list[str] = [
            "r.record_type = 'Receivable'",
            "r.is_active = 1",
            "rec.assessment_id IS NOT NULL",
        ]
        params: list[Any] = []

        if unit_id is not None:
            where.append("rec.unit_id = %s")
            params.append(unit_id)
        if status:
            where.append("r.status = %s")
            params.append(status)

        where_clause = " AND ".join(where)

        cursor.execute(
            f"""
            SELECT COUNT(*) as total 
            FROM {TABLE_NAME} r
            LEFT JOIN receivables rec ON r.record_id = rec.id
            WHERE {where_clause}
            """,
            params,
        )
        total = cursor.fetchone()["total"]

        offset = (page - 1) * page_size
        cursor.execute(
            f"""
            SELECT r.*,
                   r.record_type as reconciliation_type,
                   r.record_id as reference_id,
                   r.notes as resolution_notes,
                   r.matched_at as matched_date,
                   bt.transaction_date, bt.amount as transaction_amount,
                   bt.description as transaction_description,
                   sa.title as assessment_title, aa.allocated_amount as assessment_amount,
                   cu.unit_number, cu.owner_name
            FROM {TABLE_NAME} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            LEFT JOIN receivables rec ON r.record_id = rec.id
            LEFT JOIN assessment_allocations aa ON rec.assessment_id = aa.assessment_id AND rec.unit_id = aa.unit_id
            LEFT JOIN special_assessments sa ON aa.assessment_id = sa.id
            LEFT JOIN condo_units cu ON rec.unit_id = cu.id
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
            """
            SELECT
                COUNT(*) as total_assessments,
                COALESCE(SUM(aa.allocated_amount), 0) as total_expected,
                COALESCE(SUM(aa.paid_amount), 0) as total_collected,
                SUM(CASE WHEN aa.status = 'Paid' THEN 1 ELSE 0 END) as matched_count,
                SUM(CASE WHEN aa.status = 'Partial' THEN 1 ELSE 0 END) as partial_count,
                SUM(CASE WHEN aa.status = 'Pending' THEN 1 ELSE 0 END) as pending_count
            FROM assessment_allocations aa
            JOIN special_assessments sa ON aa.assessment_id = sa.id
            WHERE sa.status IN ('Active', 'Upcoming')
            """
        )

        result = cursor.fetchone()
        return {
            "total_assessments": result["total_assessments"] or 0,
            "total_expected": float(result["total_expected"] or 0),
            "total_collected": float(result["total_collected"] or 0),
            "outstanding_balance": float((result["total_expected"] or 0) - (result["total_collected"] or 0)),
            "matched_count": result["matched_count"] or 0,
            "needs_review_count": result["partial_count"] or 0,
        }

    # ── Helper: Get association_id from bank transaction ──────────────

    def get_association_id_for_transaction(self, transaction_id: int) -> Optional[int]:
        """Get the association_id via bank_transaction → bank_statement → bank_account → association."""
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT ba.association_id
            FROM bank_transactions bt
            JOIN bank_statements bs ON bt.bank_statement_id = bs.id
            JOIN bank_accounts ba ON bs.bank_account_id = ba.id
            WHERE bt.id = %s
            """,
            (transaction_id,),
        )

        result = cursor.fetchone()
        return result["association_id"] if result else None
