from typing import Any


class DashboardRepository:

    def __init__(self, db):
        self.db = db

    def get_kpis(self) -> dict[str, Any]:
        cursor = self.db.cursor(dictionary=True)

        # Receivables metrics (HOA deposits expected / received / late)
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(expected_amount), 0) AS expected_deposits,
                COALESCE(SUM(amount_received), 0) AS received_deposits,
                COALESCE(SUM(CASE WHEN status = 'Overdue' OR (due_date < CURRENT_DATE() AND status != 'Paid') THEN 1 ELSE 0 END), 0) AS late_invoices_count
            FROM receivables
            WHERE is_active = 1
            """
        )
        rec_data = cursor.fetchone() or {}

        expected = float(rec_data.get("expected_deposits") or 0.0)
        received = float(rec_data.get("received_deposits") or 0.0)
        late_count = int(rec_data.get("late_invoices_count") or 0)
        received_pct = round((received / expected * 100.0), 2) if expected > 0 else 0.0

        # Checking & Money Market Balances
        cursor.execute(
            """
            SELECT
                ba.account_type,
                COALESCE(SUM(CASE WHEN bt.transaction_type IN ('Deposit', 'ACH') THEN bt.amount ELSE -ABS(bt.amount) END), 0) AS balance
            FROM bank_accounts ba
            LEFT JOIN bank_statements bs ON bs.bank_account_id = ba.id AND bs.is_active = 1
            LEFT JOIN bank_transactions bt ON bt.bank_statement_id = bs.id AND bt.is_active = 1
            WHERE ba.is_active = 1
            GROUP BY ba.account_type
            """
        )
        balance_rows = cursor.fetchall()
        checking_balance = 0.0
        money_market_balance = 0.0
        for row in balance_rows:
            atype = str(row.get("account_type") or "").strip().lower()
            val = float(row.get("balance") or 0.0)
            if "checking" in atype:
                checking_balance += val
            elif "money" in atype or "market" in atype:
                money_market_balance += val

        # Pending Vendor Payments Count (Payables fallback to Invoices)
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM payables WHERE status IN ('Pending', 'partial') AND is_active = 1"
        )
        pay_row = cursor.fetchone()
        pending_payables = int(pay_row.get("cnt") or 0) if pay_row else 0

        if pending_payables == 0:
            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM invoices WHERE status = 'Pending' AND is_active = 1"
            )
            inv_row = cursor.fetchone()
            pending_payables = int(inv_row.get("cnt") or 0) if inv_row else 0

        # Pending Reconciliation Count
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM reconciliations WHERE status IN ('Unmatched', 'Suggested') AND is_active = 1"
        )
        recon_row = cursor.fetchone()
        pending_recon = int(recon_row.get("cnt") or 0) if recon_row else 0

        if pending_recon == 0:
            cursor.execute(
                "SELECT COUNT(*) AS cnt FROM bank_transactions WHERE reconciled = 0 AND is_active = 1"
            )
            bt_row = cursor.fetchone()
            pending_recon = int(bt_row.get("cnt") or 0) if bt_row else 0

        return {
            "ytd_deposits": received,
            "expected_deposits": expected,
            "received_deposits": received,
            "received_deposits_pct": received_pct,
            "checking_balance": checking_balance,
            "money_market_balance": money_market_balance,
            "pending_invoices_count": pending_payables,
            "pending_reconciliation_count": pending_recon,
            "late_invoices_count": late_count,
        }

    def get_monthly_income_expense(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        monthly_map: dict[str, dict[str, float]] = {}

        # Monthly Income from Receivables
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(COALESCE(deposit_month, due_date), '%Y-%m') AS txn_month,
                SUM(amount_received) AS total_income
            FROM receivables
            WHERE is_active = 1
            GROUP BY DATE_FORMAT(COALESCE(deposit_month, due_date), '%Y-%m')
            """
        )
        for row in cursor.fetchall():
            m = row.get("txn_month")
            if m:
                monthly_map.setdefault(m, {"total_income": 0.0, "total_expense": 0.0})
                monthly_map[m]["total_income"] += float(row.get("total_income") or 0.0)

        # Monthly Expense from Payables
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(due_date, '%Y-%m') AS txn_month,
                SUM(amount) AS total_expense
            FROM payables
            WHERE is_active = 1
            GROUP BY DATE_FORMAT(due_date, '%Y-%m')
            """
        )
        pay_rows = cursor.fetchall()
        if not pay_rows:
            # Fallback to invoices if payables has no rows
            cursor.execute(
                """
                SELECT
                    DATE_FORMAT(COALESCE(due_date, invoice_date), '%Y-%m') AS txn_month,
                    SUM(amount) AS total_expense
                FROM invoices
                WHERE is_active = 1
                GROUP BY DATE_FORMAT(COALESCE(due_date, invoice_date), '%Y-%m')
                """
            )
            pay_rows = cursor.fetchall()

        for row in pay_rows:
            m = row.get("txn_month")
            if m:
                monthly_map.setdefault(m, {"total_income": 0.0, "total_expense": 0.0})
                monthly_map[m]["total_expense"] += float(row.get("total_expense") or 0.0)

        result = [
            {
                "txn_month": month,
                "total_income": data["total_income"],
                "total_expense": data["total_expense"],
            }
            for month, data in sorted(monthly_map.items())
        ]
        return result

    def get_expense_summary_ytd(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COALESCE(v.category, 'General Expense') AS category,
                SUM(p.amount) AS total_amount
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1
            GROUP BY COALESCE(v.category, 'General Expense')
            ORDER BY total_amount DESC
            """
        )
        rows = cursor.fetchall()

        if not rows:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.category, 'General Expense') AS category,
                    SUM(i.amount) AS total_amount
                FROM invoices i
                LEFT JOIN vendors v ON v.id = i.vendor_id
                WHERE i.is_active = 1
                GROUP BY COALESCE(v.category, 'General Expense')
                ORDER BY total_amount DESC
                """
            )
            rows = cursor.fetchall()

        grand_total = sum(float(r.get("total_amount") or 0.0) for r in rows)
        result = []
        for r in rows:
            amt = float(r.get("total_amount") or 0.0)
            pct = round((amt / grand_total * 100.0), 2) if grand_total > 0 else 0.0
            result.append(
                {
                    "category": r.get("category") or "General Expense",
                    "total_amount": amt,
                    "pct": pct,
                }
            )

        return result

    def get_upcoming_vendor_payments(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COALESCE(v.vendor_name, p.pay_to) AS vendor_name,
                p.due_date,
                p.amount,
                p.status
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.status IN ('Pending', 'partial')
              AND p.is_active = 1
            ORDER BY p.due_date ASC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cursor.fetchall()

        if not rows:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.vendor_name, 'Vendor') AS vendor_name,
                    i.due_date,
                    i.amount,
                    i.status
                FROM invoices i
                LEFT JOIN vendors v ON v.id = i.vendor_id
                WHERE i.status IN ('Pending', 'Approved')
                  AND i.is_active = 1
                ORDER BY i.due_date ASC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

        return rows

    def get_outstanding_reconciliation(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                r.id,
                r.record_type AS matched_entity_type,
                r.status,
                bt.amount AS difference,
                bt.transaction_date
            FROM reconciliations r
            JOIN bank_transactions bt ON bt.id = r.bank_transaction_id
            WHERE r.status IN ('Unmatched', 'Suggested')
              AND r.is_active = 1
            ORDER BY bt.transaction_date DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cursor.fetchall()

        if not rows:
            cursor.execute(
                """
                SELECT
                    bt.id,
                    'Bank Transaction' AS matched_entity_type,
                    'Unmatched' AS status,
                    bt.amount AS difference,
                    bt.transaction_date
                FROM bank_transactions bt
                WHERE bt.reconciled = 0
                  AND bt.is_active = 1
                ORDER BY bt.transaction_date DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

        return rows

    def get_recent_activities(self, limit: int = 20) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        # Primary audit table: audit_log
        cursor.execute(
            """
            SELECT
                al.log_id AS id,
                al.action_type,
                al.table_name,
                al.detail,
                al.changed_fields,
                al.acted_at,
                u.full_name AS performed_by_name
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.acted_by
            ORDER BY al.acted_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cursor.fetchall()

        if not rows:
            # Fallback to reconciliation_audits
            cursor.execute(
                """
                SELECT
                    ra.id,
                    ra.action AS action_type,
                    'reconciliations' AS table_name,
                    ra.description AS detail,
                    NULL AS changed_fields,
                    ra.performed_at AS acted_at,
                    u.full_name AS performed_by_name
                FROM reconciliation_audits ra
                LEFT JOIN users u ON u.id = ra.performed_by
                ORDER BY ra.performed_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cursor.fetchall()

        activities = []
        for r in rows:
            action = r.get("action_type") or "ACTIVITY"
            table_name = r.get("table_name") or "record"
            by_user = r.get("performed_by_name")
            user_suffix = f" by {by_user}" if by_user else ""

            title = f"{action.replace('_', ' ').title()} on {table_name.replace('_', ' ').title()}{user_suffix}"
            detail = r.get("detail") or r.get("changed_fields") or f"{action} action executed"
            acted_at = str(r.get("acted_at")) if r.get("acted_at") else None

            activities.append(
                {
                    "id": r.get("id"),
                    "title": title,
                    "description": detail,
                    "status": "Completed",
                    "created_at": acted_at,
                    "activity_type": action,
                }
            )

        return activities
