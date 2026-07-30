import os
import uuid

from .csv_builder import build_report_csv
from .pdf_builder import build_report_pdf
from .repository import ReportRepository

REPORTS_DIR = "app/static/reports"


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

    def generate_pdf(self, report_type: str, period: str, generated_by: int) -> bytes:
        preview = self.get_preview(report_type, period)
        pdf_bytes = build_report_pdf(preview)

        os.makedirs(REPORTS_DIR, exist_ok=True)
        file_name = f"{report_type.replace(' ', '_')}_{period}_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(REPORTS_DIR, file_name)

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        self.repo.insert_report(
            report_type=report_type,
            period=period,
            file_url=f"/static/reports/{file_name}",
            file_format="PDF",
            file_size_bytes=len(pdf_bytes),
            generated_by=generated_by,
        )

        return pdf_bytes

    def generate_csv(self, report_type: str, period: str, generated_by: int) -> str:
        preview = self.get_preview(report_type, period)
        csv_content = build_report_csv(preview)

        os.makedirs(REPORTS_DIR, exist_ok=True)
        file_name = f"{report_type.replace(' ', '_')}_{period}_{uuid.uuid4().hex[:8]}.csv"
        file_path = os.path.join(REPORTS_DIR, file_name)

        with open(file_path, "w", newline="") as f:
            f.write(csv_content)

        self.repo.insert_report(
            report_type=report_type,
            period=period,
            file_url=f"/static/reports/{file_name}",
            file_format="CSV",
            file_size_bytes=len(csv_content.encode("utf-8")),
            generated_by=generated_by,
        )

        return csv_content
