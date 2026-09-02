import json
from typing import Any, Optional
from datetime import datetime
from .period_utils import format_period_display, parse_period_input


class ReportRepository:

    def __init__(self, db):
        self.db = db

    def _get_period_statement_balance(self, start_date: str, end_date: str) -> float:
        cursor = self.db.cursor(dictionary=True)
        month_num = int(start_date.split("-")[1])
        year_num = int(start_date.split("-")[0])

        cursor.execute(
            """
            SELECT bs.id, de.extracted_json
            FROM bank_statements bs
            LEFT JOIN document_extraction de ON de.id = bs.document_extraction_id
            WHERE bs.is_active = 1 AND (
                (bs.period_month IS NOT NULL AND bs.period_month = %s) OR
                (bs.period_month IS NULL AND bs.statement_period >= %s AND bs.statement_period <= %s)
            )
            ORDER BY bs.id DESC
            LIMIT 1
            """,
            (month_num, start_date, end_date),
        )
        row = cursor.fetchone()
        if row and row.get("extracted_json"):
            try:
                data = json.loads(row["extracted_json"])
                acc_summary = data.get("BankStatement", {}).get("Account_Summary", {})
                if "Ending_Balance" in acc_summary:
                    return float(str(acc_summary["Ending_Balance"]).replace(",", ""))
                elif "Beginning_Balance" in acc_summary:
                    return float(str(acc_summary["Beginning_Balance"]).replace(",", ""))
            except Exception:
                pass
        return 0.0

    def get_all(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                report_name,
                COALESCE(report_type, 'Financial Report') AS report_type,
                period_start,
                period_end,
                'READY' AS status,
                file_path AS file_url,
                format AS file_format,
                generated_at AS created_at
            FROM reports
            WHERE is_active = 1
            ORDER BY generated_at DESC
            """
        )
        rows = cursor.fetchall()
        results = []
        for r in rows:
            display_period = format_period_display(r.get("period_start"), r.get("period_end"))
            rep_type = r.get("report_type") or "Financial Report"
            rep_name = r.get("report_name") or f"{rep_type} ({display_period})"

            results.append({
                "id": r.get("id"),
                "report_name": rep_name,
                "report_type": rep_type,
                "period": display_period,
                "status": r.get("status") or "READY",
                "file_url": r.get("file_url"),
                "file_format": r.get("file_format"),
                "created_at": r.get("created_at"),
            })

        return results

    def get_totals(self, report_type: str, start_date: str, end_date: str) -> dict[str, float]:
        cursor = self.db.cursor(dictionary=True)
        clean_type = report_type.split("(")[0].strip().lower()

        statement_balance = self._get_period_statement_balance(start_date, end_date)

        # 1. ANNUAL BUDGET REPORT (YTD Jan 1 to End of Period)
        if "annual" in clean_type or "budget" in clean_type:
            year = start_date.split("-")[0]
            year_start = f"{year}-01-01"

            cursor.execute(
                """
                SELECT COALESCE(SUM(amount_received), SUM(expected_amount), 0) AS total_income
                FROM receivables
                WHERE is_active = 1 AND (
                    (deposit_month >= %s AND deposit_month <= %s) OR
                    (due_date >= %s AND due_date <= %s)
                )
                """,
                (year_start, end_date, year_start, end_date),
            )
            rec_row = cursor.fetchone()
            income = float(rec_row.get("total_income") or 0.0) if rec_row else 0.0

            if income == 0.0:
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0) AS total_income
                    FROM bank_transactions
                    WHERE is_active = 1 AND transaction_type = 'Credit'
                      AND transaction_date >= %s AND transaction_date <= %s
                    """,
                    (year_start, end_date),
                )
                bt_row = cursor.fetchone()
                income = float(bt_row.get("total_income") or 0.0) if bt_row else 0.0

            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_expense
                FROM payables
                WHERE is_active = 1 AND (
                    (due_date >= %s AND due_date <= %s) OR
                    (date_of_payment >= %s AND date_of_payment <= %s)
                )
                """,
                (year_start, end_date, year_start, end_date),
            )
            pay_row = cursor.fetchone()
            expense = float(pay_row.get("total_expense") or 0.0) if pay_row else 0.0

            if expense == 0.0:
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0) AS total_expense
                    FROM invoices
                    WHERE is_active = 1 AND (
                        (invoice_date >= %s AND invoice_date <= %s) OR
                        (due_date >= %s AND due_date <= %s)
                    )
                    """,
                    (year_start, end_date, year_start, end_date),
                )
                inv_row = cursor.fetchone()
                expense = float(inv_row.get("total_expense") or 0.0) if inv_row else 0.0

            if expense == 0.0:
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(amount), 0) AS total_expense
                    FROM bank_transactions
                    WHERE is_active = 1 AND transaction_type = 'Debit'
                      AND transaction_date >= %s AND transaction_date <= %s
                    """,
                    (year_start, end_date),
                )
                bt_row = cursor.fetchone()
                expense = float(bt_row.get("total_expense") or 0.0) if bt_row else 0.0

            if statement_balance == 0.0 and income == 0.0 and expense == 0.0:
                net_change = 0.0
            else:
                net_change = round(statement_balance + income - expense, 2)

            return {"statement_balance": statement_balance, "total_income": income, "total_expense": expense, "net_change": net_change}

        # 2. RESERVE FUND ANALYSIS
        if "reserve" in clean_type:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS capital_exp
                FROM payables
                WHERE is_active = 1 AND (
                    (due_date >= %s AND due_date <= %s) OR
                    (date_of_payment >= %s AND date_of_payment <= %s)
                ) AND (
                    LOWER(pay_to) LIKE '%reserve%' OR 
                    LOWER(pay_to) LIKE '%roof%' OR 
                    LOWER(pay_to) LIKE '%capital%' OR
                    LOWER(pay_to) LIKE '%inspection%'
                )
                """,
                (start_date, end_date, start_date, end_date),
            )
            exp_row = cursor.fetchone()
            capital_exp = float(exp_row.get("capital_exp") or 0.0) if exp_row else 0.0

            net_change = round(statement_balance - capital_exp, 2) if statement_balance > 0 else round(-capital_exp, 2)
            return {"statement_balance": statement_balance, "total_income": statement_balance, "total_expense": capital_exp, "net_change": net_change}

        # 3. DELINQUENCY REPORT
        if "delinquency" in clean_type or "delinquent" in clean_type:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(expected_amount), 0) AS total_expected,
                    COALESCE(SUM(CASE WHEN status IN ('Overdue', 'Pending', 'partial') OR balance_amount > 0 THEN balance_amount ELSE 0 END), 0) AS total_delinquent,
                    COALESCE(SUM(amount_received), 0) AS total_collected
                FROM receivables
                WHERE is_active = 1 AND (
                    (deposit_month >= %s AND deposit_month <= %s) OR
                    (due_date >= %s AND due_date <= %s)
                )
                """,
                (start_date, end_date, start_date, end_date),
            )
            delinq_row = cursor.fetchone()
            expected = float(delinq_row.get("total_expected") or 0.0) if delinq_row else 0.0
            delinquent = float(delinq_row.get("total_delinquent") or 0.0) if delinq_row else 0.0

            net_change = round(statement_balance + expected - delinquent, 2) if statement_balance > 0 else round(expected - delinquent, 2)
            return {"statement_balance": statement_balance, "total_income": expected, "total_expense": delinquent, "net_change": net_change}

        # 4. MONTHLY FINANCIAL SUMMARY (Standard)
        # Period-specific Income
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount_received), SUM(expected_amount), 0) AS total_income
            FROM receivables
            WHERE is_active = 1 AND (
                (deposit_month >= %s AND deposit_month <= %s) OR
                (due_date >= %s AND due_date <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        rec_row = cursor.fetchone()
        income = float(rec_row.get("total_income") or 0.0) if rec_row else 0.0

        if income == 0.0:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_income
                FROM bank_transactions
                WHERE is_active = 1 AND transaction_type = 'Credit'
                  AND transaction_date >= %s AND transaction_date <= %s
                """,
                (start_date, end_date),
            )
            bt_row = cursor.fetchone()
            income = float(bt_row.get("total_income") or 0.0) if bt_row else 0.0

        # Period-specific Expense
        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total_expense
            FROM payables
            WHERE is_active = 1 AND (
                (due_date >= %s AND due_date <= %s) OR
                (date_of_payment >= %s AND date_of_payment <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        pay_row = cursor.fetchone()
        expense = float(pay_row.get("total_expense") or 0.0) if pay_row else 0.0

        if expense == 0.0:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_expense
                FROM invoices
                WHERE is_active = 1 AND (
                    (invoice_date >= %s AND invoice_date <= %s) OR
                    (due_date >= %s AND due_date <= %s)
                )
                """,
                (start_date, end_date, start_date, end_date),
            )
            inv_row = cursor.fetchone()
            expense = float(inv_row.get("total_expense") or 0.0) if inv_row else 0.0

        if expense == 0.0:
            cursor.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total_expense
                FROM bank_transactions
                WHERE is_active = 1 AND transaction_type = 'Debit'
                  AND transaction_date >= %s AND transaction_date <= %s
                """,
                (start_date, end_date),
            )
            bt_row = cursor.fetchone()
            expense = float(bt_row.get("total_expense") or 0.0) if bt_row else 0.0

        if statement_balance == 0.0 and income == 0.0 and expense == 0.0:
            net_change = 0.0
        else:
            net_change = round(statement_balance + income - expense, 2)

        return {"statement_balance": statement_balance, "total_income": income, "total_expense": expense, "net_change": net_change}

    def get_line_items(self, report_type: str, start_date: str, end_date: str) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)
        clean_type = report_type.split("(")[0].strip().lower()

        if "delinquency" in clean_type or "delinquent" in clean_type:
            cursor.execute(
                """
                SELECT
                    CONCAT('Unit ', COALESCE(u.unit_number, r.unit_id), ' (', COALESCE(r.from_payer, 'Owner'), ')') AS category,
                    r.balance_amount AS amount
                FROM receivables r
                LEFT JOIN condo_units u ON u.id = r.unit_id
                WHERE r.is_active = 1 AND (
                    (r.deposit_month >= %s AND r.deposit_month <= %s) OR
                    (r.due_date >= %s AND r.due_date <= %s)
                ) AND (r.status IN ('Overdue', 'Pending', 'partial') OR r.balance_amount > 0)
                ORDER BY r.balance_amount DESC
                """,
                (start_date, end_date, start_date, end_date),
            )
            return cursor.fetchall()

        if "reserve" in clean_type:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.category, p.pay_to, 'Capital Expense') AS category,
                    SUM(p.amount) AS amount
                FROM payables p
                LEFT JOIN vendors v ON v.id = p.vendor_id
                WHERE p.is_active = 1 AND (
                    (p.due_date >= %s AND p.due_date <= %s) OR
                    (p.date_of_payment >= %s AND p.date_of_payment <= %s)
                )
                GROUP BY COALESCE(v.category, p.pay_to, 'Capital Expense')
                ORDER BY amount DESC
                """,
                (start_date, end_date, start_date, end_date),
            )
            return cursor.fetchall()

        # Payables for this period
        cursor.execute(
            """
            SELECT
                COALESCE(v.category, p.pay_to, 'General Expense') AS category,
                SUM(p.amount) AS amount
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1 AND (
                (p.due_date >= %s AND p.due_date <= %s) OR
                (p.date_of_payment >= %s AND p.date_of_payment <= %s)
            )
            GROUP BY COALESCE(v.category, p.pay_to, 'General Expense')
            ORDER BY amount DESC
            """,
            (start_date, end_date, start_date, end_date),
        )
        items = cursor.fetchall()

        if not items:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.category, 'General Expense') AS category,
                    SUM(i.amount) AS amount
                FROM invoices i
                LEFT JOIN vendors v ON v.id = i.vendor_id
                WHERE i.is_active = 1 AND (
                    (i.invoice_date >= %s AND i.invoice_date <= %s) OR
                    (i.due_date >= %s AND i.due_date <= %s)
                )
                GROUP BY COALESCE(v.category, 'General Expense')
                ORDER BY amount DESC
                """,
                (start_date, end_date, start_date, end_date),
            )
            items = cursor.fetchall()

        if not items:
            cursor.execute(
                """
                SELECT
                    COALESCE(description, 'Operational Expense') AS category,
                    SUM(amount) AS amount
                FROM bank_transactions
                WHERE is_active = 1 AND transaction_type = 'Debit'
                  AND transaction_date >= %s AND transaction_date <= %s
                GROUP BY COALESCE(description, 'Operational Expense')
                ORDER BY amount DESC
                """,
                (start_date, end_date),
            )
            items = cursor.fetchall()

        return items

    def get_all_panels_context(self, start_date: str, end_date: str) -> dict[str, Any]:
        cursor = self.db.cursor(dictionary=True)
        context = {}

        # 1. Invoices Panel
        cursor.execute(
            """
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'Approved' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as paid_amount
            FROM invoices
            WHERE is_active = 1 AND (
                (invoice_date >= %s AND invoice_date <= %s) OR
                (due_date >= %s AND due_date <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        inv_summary = cursor.fetchone() or {}
        inv_count = int(inv_summary.get("count") or 0)
        inv_total = float(inv_summary.get("total_amount") or 0.0)

        cursor.execute(
            """
            SELECT 
                COALESCE(v.vendor_name, 'Vendor') AS vendor,
                COALESCE(i.invoice_number, 'N/A') AS invoice_no,
                i.amount,
                i.status
            FROM invoices i
            LEFT JOIN vendors v ON v.id = i.vendor_id
            WHERE i.is_active = 1 AND (
                (i.invoice_date >= %s AND i.invoice_date <= %s) OR
                (i.due_date >= %s AND i.due_date <= %s)
            )
            ORDER BY i.amount DESC
            LIMIT 5
            """,
            (start_date, end_date, start_date, end_date),
        )
        inv_items = cursor.fetchall()
        inv_details = [
            f"{r.get('vendor')} #{r.get('invoice_no')} (${float(r.get('amount') or 0.0):,.2f}, {r.get('status')})"
            for r in inv_items
        ]
        context["invoices"] = {
            "has_data": inv_count > 0 or inv_total > 0,
            "count": inv_count,
            "total_amount": inv_total,
            "pending_amount": float(inv_summary.get("pending_amount") or 0.0),
            "approved_amount": float(inv_summary.get("approved_amount") or 0.0),
            "paid_amount": float(inv_summary.get("paid_amount") or 0.0),
            "details": inv_details,
        }

        # 2. Payables Panel
        cursor.execute(
            """
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status IN ('Pending', 'partial') THEN amount ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) as paid_amount
            FROM payables
            WHERE is_active = 1 AND (
                (due_date >= %s AND due_date <= %s) OR
                (date_of_payment >= %s AND date_of_payment <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        pay_summary = cursor.fetchone() or {}
        pay_count = int(pay_summary.get("count") or 0)
        pay_total = float(pay_summary.get("total_amount") or 0.0)

        cursor.execute(
            """
            SELECT 
                COALESCE(v.vendor_name, p.pay_to, 'Vendor') AS payee,
                p.amount,
                p.status
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1 AND (
                (p.due_date >= %s AND p.due_date <= %s) OR
                (p.date_of_payment >= %s AND p.date_of_payment <= %s)
            )
            ORDER BY p.amount DESC
            LIMIT 5
            """,
            (start_date, end_date, start_date, end_date),
        )
        pay_items = cursor.fetchall()
        pay_details = [
            f"{r.get('payee')} (${float(r.get('amount') or 0.0):,.2f}, {r.get('status')})"
            for r in pay_items
        ]
        context["payables"] = {
            "has_data": pay_count > 0 or pay_total > 0,
            "count": pay_count,
            "total_amount": pay_total,
            "pending_amount": float(pay_summary.get("pending_amount") or 0.0),
            "paid_amount": float(pay_summary.get("paid_amount") or 0.0),
            "details": pay_details,
        }

        # 3. Receivables Panel
        cursor.execute(
            """
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(expected_amount), 0) as expected_amount,
                COALESCE(SUM(amount_received), 0) as amount_received,
                COALESCE(SUM(CASE WHEN status IN ('Overdue', 'Pending', 'partial') OR balance_amount > 0 THEN balance_amount ELSE 0 END), 0) as balance_amount
            FROM receivables
            WHERE is_active = 1 AND (
                (deposit_month >= %s AND deposit_month <= %s) OR
                (due_date >= %s AND due_date <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        rec_summary = cursor.fetchone() or {}
        rec_count = int(rec_summary.get("count") or 0)
        rec_expected = float(rec_summary.get("expected_amount") or 0.0)
        rec_received = float(rec_summary.get("amount_received") or 0.0)
        rec_overdue = float(rec_summary.get("balance_amount") or 0.0)
        rec_pct = round((rec_received / rec_expected * 100.0), 2) if rec_expected > 0 else (100.0 if rec_received > 0 else 0.0)

        context["receivables"] = {
            "has_data": rec_count > 0 or rec_expected > 0 or rec_received > 0 or rec_overdue > 0,
            "count": rec_count,
            "expected_amount": rec_expected,
            "amount_received": rec_received,
            "overdue_amount": rec_overdue,
            "collection_pct": rec_pct,
        }

        # 4. Bank Activity & Cash Balances Panel
        cursor.execute(
            """
            SELECT 
                COUNT(*) as txn_count,
                COALESCE(SUM(CASE WHEN transaction_type = 'Credit' OR transaction_method = 'Deposit' THEN amount ELSE 0 END), 0) as credits,
                COALESCE(SUM(CASE WHEN transaction_type = 'Debit' OR transaction_method IN ('Cheque', 'Debit', 'ACH') THEN amount ELSE 0 END), 0) as debits,
                COALESCE(SUM(CASE WHEN reconciled = 1 THEN 1 ELSE 0 END), 0) as reconciled_count,
                COALESCE(SUM(CASE WHEN reconciled = 0 THEN 1 ELSE 0 END), 0) as unreconciled_count
            FROM bank_transactions
            WHERE is_active = 1 AND transaction_date >= %s AND transaction_date <= %s
            """,
            (start_date, end_date),
        )
        bank_summary = cursor.fetchone() or {}
        txn_count = int(bank_summary.get("txn_count") or 0)
        credits = float(bank_summary.get("credits") or 0.0)
        debits = float(bank_summary.get("debits") or 0.0)
        stmt_bal = self._get_period_statement_balance(start_date, end_date)

        context["bank_activity"] = {
            "has_data": txn_count > 0 or credits > 0 or debits > 0 or stmt_bal > 0,
            "txn_count": txn_count,
            "credits": credits,
            "debits": debits,
            "checking_balance": stmt_bal,
            "money_market_balance": 0.0,
        }

        # 5. Bank Reconciliation Panel
        reconciled_txns = int(bank_summary.get("reconciled_count") or 0)
        unreconciled_txns = int(bank_summary.get("unreconciled_count") or 0)

        context["reconciliation"] = {
            "has_data": unreconciled_txns > 0 or reconciled_txns > 0,
            "matched_reconciliations": reconciled_txns,
            "unmatched_reconciliations": unreconciled_txns,
            "reconciled_transactions": reconciled_txns,
            "unreconciled_transactions": unreconciled_txns,
        }

        # 6. Special Assessments Panel
        cursor.execute(
            """
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM special_assessments
            WHERE is_active = 1 AND (
                (due_date >= %s AND due_date <= %s) OR
                (created_at >= %s AND created_at <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        sa_summary = cursor.fetchone() or {}
        sa_count = int(sa_summary.get("count") or 0)
        sa_total = float(sa_summary.get("total_amount") or 0.0)

        context["special_assessments"] = {
            "has_data": sa_count > 0 or sa_total > 0,
            "count": sa_count,
            "total_amount": sa_total,
            "total_paid": 0.0,
            "balance_remaining": sa_total,
        }

        return context

    def get_comprehensive_export_context(self, start_date: str, end_date: str) -> dict[str, Any]:
        cursor = self.db.cursor(dictionary=True)
        ctx: dict[str, Any] = {}
        month_num = int(start_date.split("-")[1])
        year_num = int(start_date.split("-")[0])

        # 1. Bank Statements for period
        cursor.execute(
            """
            SELECT bs.id, bs.statement_name, bs.statement_period, bs.transaction_count, de.extracted_json
            FROM bank_statements bs
            LEFT JOIN document_extraction de ON de.id = bs.document_extraction_id
            WHERE bs.is_active = 1 AND (
                (bs.period_month IS NOT NULL AND bs.period_month = %s) OR
                (bs.period_month IS NULL AND bs.statement_period >= %s AND bs.statement_period <= %s)
            )
            ORDER BY bs.id DESC
            """,
            (month_num, start_date, end_date),
        )
        statements_raw = cursor.fetchall()
        statement_items = []
        for s in statements_raw:
            data = {}
            if s.get("extracted_json"):
                try:
                    data = json.loads(s["extracted_json"]).get("BankStatement", {})
                except Exception:
                    pass
            acc_info = data.get("Account_Information", {})
            acc_summary = data.get("Account_Summary", {})
            bank_info = data.get("Bank_Information", {})
            beg_bal = float(str(acc_summary.get("Beginning_Balance") or 0).replace(",", ""))
            tot_dep = float(str(acc_summary.get("Total_Deposits") or 0).replace(",", ""))
            tot_wth = float(str(acc_summary.get("Total_Withdrawals") or 0).replace(",", ""))
            end_bal = float(str(acc_summary.get("Ending_Balance") or 0).replace(",", ""))

            statement_items.append({
                "name": s.get("statement_name") or "Bank Statement",
                "bank_name": bank_info.get("Bank_Name") or "Millbrook Community Bank",
                "account_number": acc_info.get("Account_Number") or "XXXXXX7734",
                "statement_period": acc_info.get("Statement_Period") or format_period_display(start_date, end_date),
                "beginning_balance": beg_bal,
                "total_deposits": tot_dep,
                "total_withdrawals": tot_wth,
                "ending_balance": end_bal,
            })

        # Bank Transactions for period
        cursor.execute(
            """
            SELECT transaction_date, description, transaction_type, transaction_method, amount, reconciled
            FROM bank_transactions
            WHERE is_active = 1 AND transaction_date >= %s AND transaction_date <= %s
            ORDER BY transaction_date ASC
            """,
            (start_date, end_date),
        )
        txns = cursor.fetchall()
        bank_txns = [
            {
                "date": str(r.get("transaction_date") or ""),
                "description": r.get("description") or "Bank Transaction",
                "type": r.get("transaction_type") or "Debit",
                "method": r.get("transaction_method") or "Other",
                "amount": float(r.get("amount") or 0.0),
                "reconciled": bool(r.get("reconciled")),
            }
            for r in txns
        ]
        ctx["bank_activity"] = {
            "has_data": len(statement_items) > 0 or len(bank_txns) > 0,
            "statements": statement_items,
            "transactions": bank_txns,
        }

        # 2. Invoices for period
        cursor.execute(
            """
            SELECT i.id, i.invoice_number, i.amount, i.status, i.invoice_date, i.due_date, 
                   COALESCE(v.vendor_name, 'Vendor') as vendor_name, COALESCE(v.category, 'General') as category
            FROM invoices i
            LEFT JOIN vendors v ON v.id = i.vendor_id
            WHERE i.is_active = 1 AND (
                (i.invoice_date >= %s AND i.invoice_date <= %s) OR
                (i.due_date >= %s AND i.due_date <= %s)
            )
            ORDER BY i.amount DESC
            """,
            (start_date, end_date, start_date, end_date),
        )
        inv_rows = cursor.fetchall()
        invoices_list = [
            {
                "vendor": r.get("vendor_name"),
                "invoice_number": r.get("invoice_number") or "N/A",
                "amount": float(r.get("amount") or 0.0),
                "status": r.get("status") or "Pending",
                "date": str(r.get("invoice_date") or ""),
                "due_date": str(r.get("due_date") or ""),
                "category": r.get("category"),
            }
            for r in inv_rows
        ]
        ctx["invoices"] = {
            "has_data": len(invoices_list) > 0,
            "count": len(invoices_list),
            "total_amount": sum(i["amount"] for i in invoices_list),
            "items": invoices_list,
        }

        # 3. Payables for period
        cursor.execute(
            """
            SELECT p.id, p.amount, p.status, p.due_date, p.date_of_payment, 
                   COALESCE(v.vendor_name, p.pay_to, 'Vendor') as payee,
                   COALESCE(v.category, 'Operational Expense') as category
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1 AND (
                (p.due_date >= %s AND p.due_date <= %s) OR
                (p.date_of_payment >= %s AND p.date_of_payment <= %s)
            )
            ORDER BY p.amount DESC
            """,
            (start_date, end_date, start_date, end_date),
        )
        pay_rows = cursor.fetchall()
        payables_list = [
            {
                "payee": r.get("payee"),
                "amount": float(r.get("amount") or 0.0),
                "status": r.get("status") or "Pending",
                "due_date": str(r.get("due_date") or ""),
                "payment_date": str(r.get("date_of_payment") or ""),
                "category": r.get("category"),
            }
            for r in pay_rows
        ]
        ctx["payables"] = {
            "has_data": len(payables_list) > 0,
            "count": len(payables_list),
            "total_amount": sum(p["amount"] for p in payables_list),
            "items": payables_list,
        }

        # 4. Receivables for period
        cursor.execute(
            """
            SELECT r.id, r.unit_id, r.from_payer, r.expected_amount, r.amount_received, r.balance_amount, r.status, r.due_date,
                   COALESCE(u.unit_number, CONCAT('Unit ', r.unit_id)) as unit_label
            FROM receivables r
            LEFT JOIN condo_units u ON u.id = r.unit_id
            WHERE r.is_active = 1 AND (
                (r.deposit_month >= %s AND r.deposit_month <= %s) OR
                (r.due_date >= %s AND r.due_date <= %s)
            )
            ORDER BY r.expected_amount DESC
            """,
            (start_date, end_date, start_date, end_date),
        )
        rec_rows = cursor.fetchall()
        receivables_list = [
            {
                "unit": r.get("unit_label") or "Unit",
                "payer": r.get("from_payer") or "Owner",
                "expected": float(r.get("expected_amount") or 0.0),
                "received": float(r.get("amount_received") or 0.0),
                "balance": float(r.get("balance_amount") or 0.0),
                "status": r.get("status") or "Paid",
            }
            for r in rec_rows
        ]
        ctx["receivables"] = {
            "has_data": len(receivables_list) > 0,
            "count": len(receivables_list),
            "total_expected": sum(r["expected"] for r in receivables_list),
            "total_received": sum(r["received"] for r in receivables_list),
            "items": receivables_list,
        }

        # 5. Bank Reconciliation for period
        reconciled_txns = sum(1 for t in bank_txns if t.get("reconciled"))
        unreconciled_txns = len(bank_txns) - reconciled_txns

        ctx["reconciliation"] = {
            "has_data": len(bank_txns) > 0,
            "total_count": len(bank_txns),
            "reconciled_count": reconciled_txns,
            "unreconciled_count": unreconciled_txns,
        }

        # 6. Special Assessments for period
        cursor.execute(
            """
            SELECT sa.id, sa.title as project_name, sa.total_amount, sa.status, sa.due_date
            FROM special_assessments sa
            WHERE sa.is_active = 1 AND (
                (sa.due_date >= %s AND sa.due_date <= %s) OR
                (sa.created_at >= %s AND sa.created_at <= %s)
            )
            """,
            (start_date, end_date, start_date, end_date),
        )
        sa_rows = cursor.fetchall()
        sa_list = [
            {
                "project_name": r.get("project_name") or "Capital Project",
                "total_amount": float(r.get("total_amount") or 0.0),
                "status": r.get("status") or "Active",
                "due_date": str(r.get("due_date") or ""),
            }
            for r in sa_rows
        ]
        ctx["special_assessments"] = {
            "has_data": len(sa_list) > 0,
            "items": sa_list,
        }

        return ctx

    def insert_report(
        self,
        report_type: str,
        start_date: str,
        end_date: str,
        display_period: str,
        file_url: str,
        file_format: str,
        file_size_bytes: int,
        generated_by: int,
    ) -> int:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute("SELECT id FROM condo_associations WHERE is_active = 1 LIMIT 1")
        assoc_row = cursor.fetchone()
        if assoc_row:
            assoc_id = assoc_row["id"]
        else:
            cursor.execute(
                "INSERT INTO condo_associations (name, address) VALUES ('Default Association', '123 Main Street')"
            )
            self.db.commit()
            assoc_id = cursor.lastrowid

        user_id_to_use: Optional[int] = None
        cursor.execute("SELECT id FROM users WHERE id = %s", (generated_by,))
        user = cursor.fetchone()
        if user:
            user_id_to_use = user["id"]
        else:
            cursor.execute("SELECT id FROM users LIMIT 1")
            first_user = cursor.fetchone()
            if first_user:
                user_id_to_use = first_user["id"]
            else:
                cursor.execute(
                    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('System Admin', 'admin@condo.local', 'hash', 'Admin')"
                )
                self.db.commit()
                user_id_to_use = cursor.lastrowid

        clean_type = report_type.split("(")[0].strip()
        report_name = f"{clean_type} ({display_period})"

        cursor.execute(
            """
            SELECT id FROM reports
            WHERE report_type = %s AND period_start = %s AND period_end = %s AND is_active = 1
            LIMIT 1
            """,
            (clean_type, start_date, end_date),
        )
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                "UPDATE reports SET generated_at = CURRENT_TIMESTAMP, report_name = %s WHERE id = %s",
                (report_name, existing["id"]),
            )
            self.db.commit()
            return existing["id"]

        cursor.execute(
            """
            INSERT INTO reports
                (association_id, report_name, report_type, period_start, period_end, format, file_path, generated_by, created_by)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                assoc_id,
                report_name,
                clean_type,
                start_date,
                end_date,
                file_format.upper(),
                file_url,
                user_id_to_use,
                user_id_to_use,
            ),
        )
        self.db.commit()
        return cursor.lastrowid

    def delete_report(self, report_id: int, updated_by: Optional[int] = None) -> bool:
        cursor = self.db.cursor()
        cursor.execute(
            "UPDATE reports SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (report_id,),
        )
        self.db.commit()
        return cursor.rowcount > 0
