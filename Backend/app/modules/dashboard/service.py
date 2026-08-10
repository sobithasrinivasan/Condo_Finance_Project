from .repository import DashboardRepository


class DashboardService:

    def __init__(self, db):
        self.db = db
        self.repo = DashboardRepository(db)

    def get_summary(self) -> dict:
        kpis_data = self.repo.get_kpis()

        expected_deposits = kpis_data.get("expected_deposits", 0.0)
        received_deposits = kpis_data.get("received_deposits", 0.0)
        pending_deposits = max(0.0, expected_deposits - received_deposits)
        collection_pct = kpis_data.get("received_deposits_pct", 0.0)

        deposit_collection_ytd = {
            "expected": expected_deposits,
            "collected": received_deposits,
            "pending": pending_deposits,
            "collection_pct": collection_pct,
        }

        charts = {
            "monthly_income_expense": self.repo.get_monthly_income_expense(),
            "deposit_collection_ytd": deposit_collection_ytd,
            "expense_summary_ytd": self.repo.get_expense_summary_ytd(),
        }

        tables = {
            "upcoming_vendor_payments": self.repo.get_upcoming_vendor_payments(),
            "outstanding_reconciliation": self.repo.get_outstanding_reconciliation(),
        }

        return {
            "kpis": kpis_data,
            "charts": charts,
            "tables": tables,
        }

    def get_activities(self) -> list[dict]:
        return self.repo.get_recent_activities()
