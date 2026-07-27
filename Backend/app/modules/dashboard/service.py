from .repository import DashboardRepository
 
 
class DashboardService:
 
    def __init__(self, db):
        self.db = db
        self.repo = DashboardRepository(db)
 
    def get_summary(self) -> dict:
        ytd_deposits = self.repo.get_ytd_deposits()["ytd_deposits"]
        received_deposits = self.repo.get_received_deposits()["received_deposits"] or 0
        net_balance = self.repo.get_account_balance()["net_balance"]
        pending_vendor_total = self.repo.get_pending_vendor_payments_total()["pending_total"]
 
        if ytd_deposits:
            received_pct = round((received_deposits / ytd_deposits) * 100, 1)
        else:
            received_pct = 0.0
 
        kpis = {
            "ytd_deposits": ytd_deposits,
            "received_deposits": received_deposits,
            "received_deposits_pct": received_pct,
            "checking_balance": net_balance,
            "pending_vendor_payments": pending_vendor_total,
            "pending_reconciliation_count": self.repo.get_pending_reconciliation_count(),
            "late_invoices_count": self.repo.get_late_invoices_count(),
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