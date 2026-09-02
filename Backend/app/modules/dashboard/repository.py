import json
from typing import Any


class DashboardRepository:

    def __init__(self, db):
        self.db = db

    def _get_base_account_balances(self) -> dict[str, float]:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT 
                ba.id as account_id,
                ba.account_name,
                ba.account_type,
                bs.id as statement_id,
                de.extracted_json
            FROM bank_accounts ba
            LEFT JOIN bank_statements bs ON bs.bank_account_id = ba.id AND bs.is_active = 1
            LEFT JOIN document_extraction de ON de.id = bs.document_extraction_id
            WHERE ba.is_active = 1
            ORDER BY bs.statement_period DESC, bs.id DESC
            """
        )
        rows = cursor.fetchall()
        seen_accounts = set()
        balances = {"checking": 0.0, "money_market": 0.0}

        for r in rows:
            acc_id = r["account_id"]
            acc_type = str(r["account_type"] or "").strip().lower()
            key = "checking" if "checking" in acc_type else "money_market"

            if acc_id not in seen_accounts:
                seen_accounts.add(acc_id)
                stmt_bal = None
                if r.get("extracted_json"):
                    try:
                        data = json.loads(r["extracted_json"])
                        acc_summary = data.get("BankStatement", {}).get("Account_Summary", {})
                        if "Ending_Balance" in acc_summary:
                            stmt_bal = float(str(acc_summary["Ending_Balance"]).replace(",", ""))
                        elif "Beginning_Balance" in acc_summary:
                            stmt_bal = float(str(acc_summary["Beginning_Balance"]).replace(",", ""))
                    except Exception:
                        pass

                if stmt_bal is not None:
                    balances[key] += stmt_bal
                else:
                    # Fallback to summing active transactions for this account
                    cursor.execute(
                        """
                        SELECT COALESCE(SUM(CASE 
                            WHEN bt.transaction_type = 'Credit' OR bt.transaction_method = 'Deposit' THEN bt.amount 
                            WHEN bt.transaction_type = 'Debit' OR bt.transaction_method IN ('Cheque', 'Debit', 'ACH') THEN -ABS(bt.amount)
                            ELSE bt.amount 
                        END), 0) AS txn_net
                        FROM bank_statements bs2
                        JOIN bank_transactions bt ON bt.bank_statement_id = bs2.id AND bt.is_active = 1
                        WHERE bs2.bank_account_id = %s AND bs2.is_active = 1
                        """,
                        (acc_id,),
                    )
                    t_row = cursor.fetchone()
                    balances[key] += float(t_row.get("txn_net") or 0.0) if t_row else 0.0

        return balances

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

        # Fallback if receivables has no records
        if received == 0.0:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_credits
                FROM bank_transactions
                WHERE is_active = 1 AND transaction_type = 'Credit'
                """
            )
            bt_rec = cursor.fetchone()
            received = float(bt_rec.get("total_credits") or 0.0) if bt_rec else 0.0

        if expected == 0.0:
            cursor.execute(
                "SELECT COALESCE(SUM(monthly_hoa_amount), 0) AS monthly_dues FROM condo_units WHERE is_active = 1"
            )
            cu_rec = cursor.fetchone()
            monthly_dues = float(cu_rec.get("monthly_dues") or 0.0) if cu_rec else 0.0
            expected = max(monthly_dues, received)

        received_pct = round((received / expected * 100.0), 2) if expected > 0 else (100.0 if received > 0 else 0.0)

        # Base statement balances (e.g. ~$19,827.22 ending balance from bank statement)
        base_balances = self._get_base_account_balances()
        base_checking = base_balances["checking"]
        money_market_balance = base_balances["money_market"]

        # Total amount we should pay vendors (Pending Payables & Invoices)
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_pending_payables
            FROM payables
            WHERE is_active = 1 AND status IN ('Pending', 'partial')
            """
        )
        pay_pend_row = cursor.fetchone()
        pending_payables_amt = float(pay_pend_row.get("total_pending_payables") or 0.0) if pay_pend_row else 0.0

        if pending_payables_amt == 0.0:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_pending_invoices
                FROM invoices
                WHERE is_active = 1 AND status = 'Pending'
                """
            )
            inv_pend_row = cursor.fetchone()
            pending_payables_amt = float(inv_pend_row.get("total_pending_invoices") or 0.0) if inv_pend_row else 0.0

        # Checking Balance = (Statement Bank Balance) + (Total Income) - (Total Expenses)
        checking_balance = round(base_checking + received - pending_payables_amt, 2)

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
            "statement_balance": base_checking,
            "total_expenses": pending_payables_amt,
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
                DATE_FORMAT(COALESCE(due_date, date_of_payment), '%Y-%m') AS txn_month,
                SUM(amount) AS total_expense
            FROM payables
            WHERE is_active = 1
            GROUP BY DATE_FORMAT(COALESCE(due_date, date_of_payment), '%Y-%m')
            """
        )
        for row in cursor.fetchall():
            m = row.get("txn_month")
            if m:
                monthly_map.setdefault(m, {"total_income": 0.0, "total_expense": 0.0})
                monthly_map[m]["total_expense"] += float(row.get("total_expense") or 0.0)

        # Monthly Expense from Invoices (if payables missing)
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
        for row in cursor.fetchall():
            m = row.get("txn_month")
            if m:
                monthly_map.setdefault(m, {"total_income": 0.0, "total_expense": 0.0})
                if monthly_map[m]["total_expense"] == 0.0:
                    monthly_map[m]["total_expense"] += float(row.get("total_expense") or 0.0)

        # Fallback to bank_transactions if monthly_map is empty or missing data
        cursor.execute(
            """
            SELECT
                DATE_FORMAT(transaction_date, '%Y-%m') AS txn_month,
                SUM(CASE WHEN transaction_type = 'Credit' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN transaction_type = 'Debit' THEN amount ELSE 0 END) AS total_expense
            FROM bank_transactions
            WHERE is_active = 1
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
            """
        )
        for row in cursor.fetchall():
            m = row.get("txn_month")
            if m:
                monthly_map.setdefault(m, {"total_income": 0.0, "total_expense": 0.0})
                if monthly_map[m]["total_income"] == 0.0:
                    monthly_map[m]["total_income"] += float(row.get("total_income") or 0.0)
                if monthly_map[m]["total_expense"] == 0.0:
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
                COALESCE(v.category, p.pay_to, 'General Expense') AS category,
                SUM(p.amount) AS total_amount
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1
            GROUP BY COALESCE(v.category, p.pay_to, 'General Expense')
            ORDER BY total_amount DESC
            """
        )
        rows = cursor.fetchall()

        if not rows:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.category, i.category, 'General Expense') AS category,
                    SUM(i.amount) AS total_amount
                FROM invoices i
                LEFT JOIN vendors v ON v.id = i.vendor_id
                WHERE i.is_active = 1
                GROUP BY COALESCE(v.category, i.category, 'General Expense')
                ORDER BY total_amount DESC
                """
            )
            rows = cursor.fetchall()

        if not rows:
            cursor.execute(
                """
                SELECT
                    COALESCE(description, 'Operational Expense') AS category,
                    SUM(amount) AS total_amount
                FROM bank_transactions
                WHERE is_active = 1 AND transaction_type = 'Debit'
                GROUP BY COALESCE(description, 'Operational Expense')
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
