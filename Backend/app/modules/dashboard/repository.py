from app.modules.invoice.model import TABLE_NAME as TABLE_INVOICES
from app.modules.vendor.models import TABLE_NAME as TABLE_VENDORS
from app.modules.bank_reconciliation.model import TABLE_NAME as TABLE_RECONCILIATIONS
TABLE_DEPOSITS = "deposits"

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
                r.reconciliation_type AS matched_entity_type,
                r.status,
                (bt.amount - COALESCE(
                    CASE
                        WHEN r.reconciliation_type = 'Invoice' THEN inv.amount
                        WHEN r.reconciliation_type = 'Deposit' THEN cu.monthly_hoa_amount
                        ELSE bt.amount
                    END, 0)) AS difference
            FROM {TABLE_RECONCILIATIONS} r
            JOIN bank_transactions bt ON r.bank_transaction_id = bt.id
            LEFT JOIN invoices inv ON r.reconciliation_type = 'Invoice' AND r.reference_id = inv.id
            LEFT JOIN condo_units cu ON r.reconciliation_type = 'Deposit' AND r.reference_id = cu.id
            WHERE r.status IN ('NeedsReview', 'Unresolved')
              AND r.is_active = 1
            ORDER BY r.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )

        return cursor.fetchall()

