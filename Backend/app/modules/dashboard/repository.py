from app.modules.invoice.model import TABLE_NAME as TABLE_INVOICES
from app.modules.statement.model import TABLE_TRANSACTIONS


TABLE_VENDORS = "vendors"


class DashboardRepository:

    def __init__(self, db):
        self.db = db

    def get_ytd_deposits(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(amount), 0) AS ytd_deposits
            FROM {TABLE_TRANSACTIONS}
            WHERE type = 'Credit'
              AND is_active = 1
              AND YEAR(transaction_date) = YEAR(CURDATE())
            """
        )

        return cursor.fetchone()

    def get_received_deposits(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(amount), 0) AS received_deposits
            FROM {TABLE_TRANSACTIONS}
            WHERE type = 'Credit'
              AND reconciled = 1
              AND is_active = 1
              AND YEAR(transaction_date) = YEAR(CURDATE())
            """
        )

        return cursor.fetchone()

    def get_account_balance(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(
                CASE WHEN type = 'Credit' THEN amount ELSE -amount END
            ), 0) AS net_balance
            FROM {TABLE_TRANSACTIONS}
            WHERE is_active = 1
            """
        )

        return cursor.fetchone()

    def get_pending_vendor_payments_total(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(amount), 0) AS pending_total
            FROM {TABLE_INVOICES}
            WHERE status = 'Pending'
              AND is_active = 1
            """
        )

        return cursor.fetchone()

    def get_pending_reconciliation_count(self) -> int:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COUNT(*) AS cnt
            FROM {TABLE_TRANSACTIONS}
            WHERE reconciled = 0
              AND is_active = 1
            """
        )

        return cursor.fetchone()["cnt"]

    def get_late_invoices_count(self) -> int:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT COUNT(*) AS cnt
            FROM {TABLE_INVOICES}
            WHERE status = 'Pending'
              AND due_date < CURDATE()
              AND is_active = 1
            """
        )

        return cursor.fetchone()["cnt"]

    def get_monthly_income_expense(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                DATE_FORMAT(transaction_date, '%b') AS month,
                SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS income_amount,
                SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END) AS expense_amount
            FROM {TABLE_TRANSACTIONS}
            WHERE is_active = 1
              AND YEAR(transaction_date) = YEAR(CURDATE())
            GROUP BY YEAR(transaction_date), MONTH(transaction_date)
            ORDER BY MONTH(transaction_date)
            """
        )

        return cursor.fetchall()

    def get_expense_summary_ytd(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                v.category AS category,
                ROUND(SUM(i.amount) * 100.0 / NULLIF((
                    SELECT SUM(amount) FROM {TABLE_INVOICES}
                    WHERE status = 'Paid'
                      AND is_active = 1
                      AND YEAR(paid_at) = YEAR(CURDATE())
                ), 0), 1) AS percentage
            FROM {TABLE_INVOICES} i
            JOIN {TABLE_VENDORS} v ON v.id = i.vendor_id
            WHERE i.status = 'Paid'
              AND i.is_active = 1
              AND YEAR(i.paid_at) = YEAR(CURDATE())
            GROUP BY v.category
            ORDER BY percentage DESC
            """
        )

        return cursor.fetchall()

    def get_upcoming_vendor_payments(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                v.name AS vendor_name,
                i.due_date,
                i.amount,
                i.status
            FROM {TABLE_INVOICES} i
            JOIN {TABLE_VENDORS} v ON v.id = i.vendor_id
            WHERE i.status = 'Pending'
              AND i.is_active = 1
            ORDER BY i.due_date ASC
            LIMIT %s
            """,
            (limit,),
        )

        return cursor.fetchall()

    def get_outstanding_reconciliation(self, limit: int = 10) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                description,
                transaction_date AS date,
                amount,
                'Unmatched' AS status
            FROM {TABLE_TRANSACTIONS}
            WHERE reconciled = 0
              AND is_active = 1
            ORDER BY transaction_date DESC
            LIMIT %s
            """,
            (limit,),
        )

        return cursor.fetchall()
