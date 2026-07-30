from app.modules.invoice.model import TABLE_NAME as INVOICES
from app.modules.vendor.models import TABLE_NAME as VENDORS

TABLE_REPORTS = "reports"

class ReportRepository:

    def __init__(self, db):
        self.db = db

    def get_all(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT id, report_type, period, status, file_url, file_format, created_at
            FROM {TABLE_REPORTS}
            WHERE is_active = 1
            ORDER BY created_at DESC
            """
        )

        return cursor.fetchall()

    def get_totals(self, period_start: str) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS total_income,
                SUM(CASE WHEN type = 'Debit' THEN ABS(amount) ELSE 0 END) AS total_expense
            FROM bank_transactions
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
            FROM {INVOICES} i
            JOIN {VENDORS} v ON v.id = i.vendor_id
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

    def insert_report(self, report_type: str, period: str, file_url: str, file_format: str, file_size_bytes: int, generated_by: int) -> int:
        cursor = self.db.cursor()

        cursor.execute(
            f"""
            INSERT INTO {TABLE_REPORTS}
                (report_type, period, generated_by, status, file_url, file_format, file_size_bytes, created_by)
            VALUES
                (%s, %s, %s, 'Ready', %s, %s, %s, %s)
            """,
            (report_type, period, generated_by, file_url, file_format, file_size_bytes, str(generated_by)),
        )
        self.db.commit()

        return cursor.lastrowid
