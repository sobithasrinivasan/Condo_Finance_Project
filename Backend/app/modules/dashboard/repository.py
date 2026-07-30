from app.modules.invoice.model import TABLE_NAME as TABLE_INVOICES
from app.modules.vendor.models import TABLE_NAME as TABLE_VENDORS
TABLE_DEPOSITS = "deposits"
TABLE_RECONCILIATIONS = "reconciliations"

class DashboardRepository:

    def __init__(self, db):
        self.db = db

    def get_summary(self) -> dict:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM vw_dashboard_summary")

        return cursor.fetchone()

    def get_monthly_income_expense(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM vw_monthly_income_expense ORDER BY txn_month")

        return cursor.fetchall()

    def get_expense_summary_ytd(self) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM vw_expense_summary ORDER BY pct DESC")

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
                r.id,
                r.matched_entity_type,
                r.status,
                r.difference
            FROM {TABLE_RECONCILIATIONS} r
            WHERE r.status IN ('Unmatched', 'Suggested')
              AND r.is_active = 1
            ORDER BY r.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )

        return cursor.fetchall()
