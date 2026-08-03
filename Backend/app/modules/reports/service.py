import os
import uuid

from .csv_builder import build_report_csv
from .pdf_builder import build_report_pdf
from .repository import ReportRepository

from google import genai
from app.core.settings import settings

REPORTS_DIR = "app/static/reports"


class ReportService:

    def __init__(self, db):
        self.db = db
        self.repo = ReportRepository(db)

    def list_available(self) -> list[dict]:
        return self.repo.get_all()

    def generate_ai_narrative(self, report_type: str, period: str, total_income: float, total_expense: float, net_change: float, line_items: list[dict]) -> str:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            breakdown_str = ", ".join([f"{item['category']}: ${item['amount']:,.2f}" for item in line_items]) if line_items else "No categorized expenses recorded"
            prompt = (
                f"You are a condo financial advisor. Analyze the following financial data for {report_type} for period {period}:\n"
                f"Total Income: ${total_income:,.2f}\n"
                f"Total Expense: ${total_expense:,.2f}\n"
                f"Net Change: ${net_change:,.2f}\n"
                f"Expenses Breakdown: {breakdown_str}\n\n"
                f"Write a concise 3-4 sentence financial executive story explaining the performance, major cost drivers, and overall health of the condo association."
            )
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception:
            pass
        return f"Financial summary for {period}: Total income reached ${total_income:,.2f} against total expenses of ${total_expense:,.2f}, resulting in a net reserve change of ${net_change:,.2f}."

    def get_preview(self, report_type: str, period: str) -> dict:
        period_start = f"{period}-01"

        totals = self.repo.get_totals(period_start)
        line_items = self.repo.get_line_items(period_start)

        total_income = float(totals["total_income"] or 0)
        total_expense = float(totals["total_expense"] or 0)
        net_change = total_income - total_expense

        ai_summary = self.generate_ai_narrative(
            report_type=report_type,
            period=period,
            total_income=total_income,
            total_expense=total_expense,
            net_change=net_change,
            line_items=line_items
        )

        return {
            "report_type": report_type,
            "period": period,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_change": net_change,
            "line_items": line_items,
            "ai_summary": ai_summary
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
