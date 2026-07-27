from app.modules.vendor.model import TABLE_NAME as TABLE_INVOICES
from app.modules.statement.model import TABLE_TRANSACTIONS

TABLE_VENDORS = "vendors"


class ReportRepository:

    def __init__(self, db):
        self.db = db

    def get_all(self) -> list[dict]:
        return []

    def get_totals(self, period_start: str) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END) AS total_expense
            FROM {TABLE_TRANSACTIONS}
            WHERE is_active = 1
              AND transaction_date >= %s
              AND transaction_date <= LAST_DAY(%s)
            """,
            (period_start, period_start),
        )

        return cursor.fetchone()

    def get_line_items(self, period_start: str) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT
                v.category AS category,
                SUM(i.amount) AS amount
            FROM {TABLE_INVOICES} i
            JOIN {TABLE_VENDORS} v ON v.id = i.vendor_id
            WHERE i.status = 'Paid'
              AND i.is_active = 1
              AND i.paid_at >= %s
              AND i.paid_at <= LAST_DAY(%s)
            GROUP BY v.category
            ORDER BY amount DESC
            """,
            (period_start, period_start),
        )

        return cursor.fetchall()
