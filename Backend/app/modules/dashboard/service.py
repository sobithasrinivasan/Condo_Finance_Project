from .repository import DashboardRepository


class DashboardService:

    def __init__(self, db):
        self.db = db
        self.repo = DashboardRepository(db)

    def get_summary(self) -> dict:
        summary = self.repo.get_summary()

        kpis = {
            "ytd_deposits": summary["ytd_expected"],
            "received_deposits": summary["ytd_received"],
            "received_deposits_pct": summary["collection_rate_pct"] or 0.0,
            "checking_balance": summary["checking_balance_approx"],
            "pending_invoices_count": summary["pending_invoices"],
            "pending_reconciliation_count": summary["pending_reconciliation"],
            "late_invoices_count": summary["late_hoa_units"],
        }

        charts = {
            "monthly_income_expense": self.repo.get_monthly_income_expense(),
            "expense_summary_ytd": self.repo.get_expense_summary_ytd(),
        }

        tables = {
            "upcoming_vendor_payments": self.repo.get_upcoming_vendor_payments(),
            "outstanding_reconciliation": self.repo.get_outstanding_reconciliation(),
        }

        return {"kpis": kpis, "charts": charts, "tables": tables}
