from typing import Any, Optional


class ReportRepository:

    def __init__(self, db):
        self.db = db

    def get_all(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                COALESCE(report_name, report_type, 'Financial Report') AS report_name,
                COALESCE(report_type, 'Financial Report') AS report_type,
                COALESCE(DATE_FORMAT(period_start, '%Y-%m'), '2026-06') AS period,
                'READY' AS status,
                file_path AS file_url,
                format AS file_format,
                generated_at AS created_at
            FROM reports
            WHERE is_active = 1
            ORDER BY generated_at DESC
            """
        )

        return cursor.fetchall()

    def get_totals(self, period_start: str) -> dict[str, float]:
        cursor = self.db.cursor(dictionary=True)

        # 1. Income from Receivables
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(amount_received), SUM(expected_amount), 0) AS total_income
            FROM receivables
            WHERE is_active = 1
              AND deposit_month >= %s
              AND deposit_month <= LAST_DAY(%s)
            """,
            (period_start, period_start),
        )
        rec_row = cursor.fetchone()
        income = float(rec_row.get("total_income") or 0.0) if rec_row else 0.0

        # 2. Expense from Payables
        cursor.execute(
            """
            SELECT
                COALESCE(SUM(amount), 0) AS total_expense
            FROM payables
            WHERE is_active = 1
              AND due_date >= %s
              AND due_date <= LAST_DAY(%s)
            """,
            (period_start, period_start),
        )
        pay_row = cursor.fetchone()
        expense = float(pay_row.get("total_expense") or 0.0) if pay_row else 0.0

        # Fallback to Invoices if payables total is 0
        if expense == 0.0:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(amount), 0) AS total_expense
                FROM invoices
                WHERE is_active = 1
                  AND (invoice_date >= %s AND invoice_date <= LAST_DAY(%s))
                """,
                (period_start, period_start),
            )
            inv_row = cursor.fetchone()
            expense = float(inv_row.get("total_expense") or 0.0) if inv_row else 0.0

        # Fallback to Bank Transactions if both income and expense are 0
        if income == 0.0 and expense == 0.0:
            cursor.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type IN ('Deposit', 'ACH') THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN transaction_type IN ('Cheque', 'Debit') THEN ABS(amount) ELSE 0 END), 0) AS total_expense
                FROM bank_transactions
                WHERE is_active = 1
                  AND transaction_date >= %s
                  AND transaction_date <= LAST_DAY(%s)
                """,
                (period_start, period_start),
            )
            bt_row = cursor.fetchone()
            if bt_row:
                income = float(bt_row.get("total_income") or 0.0)
                expense = float(bt_row.get("total_expense") or 0.0)

        return {"total_income": income, "total_expense": expense}

    def get_line_items(self, period_start: str) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                COALESCE(v.category, 'General Expense') AS category,
                SUM(p.amount) AS amount
            FROM payables p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = 1
              AND p.due_date >= %s
              AND p.due_date <= LAST_DAY(%s)
            GROUP BY COALESCE(v.category, 'General Expense')
            ORDER BY amount DESC
            """,
            (period_start, period_start),
        )
        items = cursor.fetchall()

        if not items:
            cursor.execute(
                """
                SELECT
                    COALESCE(v.category, i.category, 'General Expense') AS category,
                    SUM(i.amount) AS amount
                FROM invoices i
                LEFT JOIN vendors v ON v.id = i.vendor_id
                WHERE i.is_active = 1
                  AND i.invoice_date >= %s
                  AND i.invoice_date <= LAST_DAY(%s)
                GROUP BY COALESCE(v.category, i.category, 'General Expense')
                ORDER BY amount DESC
                """,
                (period_start, period_start),
            )
            items = cursor.fetchall()

        return items

    def insert_report(
        self,
        report_type: str,
        period: str,
        file_url: str,
        file_format: str,
        file_size_bytes: int,
        generated_by: int,
    ) -> int:
        cursor = self.db.cursor(dictionary=True)

        # Get or create valid association_id
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

        # Ensure valid generated_by user exists or fallback
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

        period_start = f"{period}-01"
        month_names = {
            "01": "January", "02": "February", "03": "March", "04": "April",
            "05": "May", "06": "June", "07": "July", "08": "August",
            "09": "September", "10": "October", "11": "November", "12": "December"
        }
        parts = period.split("-")
        period_formatted = period
        if len(parts) == 2 and parts[1] in month_names:
            period_formatted = f"{month_names[parts[1]]} {parts[0]}"

        clean_type = report_type.split("(")[0].strip()
        report_name = f"{clean_type} ({period_formatted})"

        cursor.execute(
            """
            INSERT INTO reports
                (association_id, report_name, report_type, period_start, period_end, format, file_path, generated_by, created_by)
            VALUES
                (%s, %s, %s, %s, LAST_DAY(%s), %s, %s, %s, %s)
            """,
            (
                assoc_id,
                report_name,
                clean_type,
                period_start,
                period_start,
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
