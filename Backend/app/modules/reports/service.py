from .csv_builder import build_report_csv
from .pdf_builder import build_report_pdf
from .repository import ReportRepository


class ReportService:

    def __init__(self, db):
        self.db = db
        self.repo = ReportRepository(db)

    def list_available(self) -> list[dict]:
        return self.repo.get_all()

    def get_preview(self, report_type: str, period: str) -> dict:
        period_start = f"{period}-01"

        totals = self.repo.get_totals(period_start)
        line_items = self.repo.get_line_items(period_start)

        total_income = totals["total_income"] or 0
        total_expense = totals["total_expense"] or 0

        return {
            "report_type": report_type,
            "period": period,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_change": total_income - total_expense,
            "line_items": line_items,
        }

    def generate_pdf(self, report_type: str, period: str) -> bytes:
        preview = self.get_preview(report_type, period)
        return build_report_pdf(preview)

    def generate_csv(self, report_type: str, period: str) -> str:
        preview = self.get_preview(report_type, period)
        return build_report_csv(preview)
