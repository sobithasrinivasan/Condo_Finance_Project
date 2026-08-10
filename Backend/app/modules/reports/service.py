import os
import uuid
from typing import Optional

from google import genai

from app.core.settings import settings
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

    def generate_ai_narrative(
        self,
        report_type: str,
        period: str,
        total_income: float,
        total_expense: float,
        net_change: float,
        line_items: list[dict],
    ) -> str:
        clean_type = report_type.split("(")[0].strip().lower()

        try:
            if settings.GEMINI_API_KEY:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                breakdown_str = (
                    ", ".join([f"{item['category']}: ${item['amount']:,.2f}" for item in line_items])
                    if line_items
                    else "No categorized items recorded"
                )

                if "delinquency" in clean_type or "delinquent" in clean_type:
                    role_prompt = "You are a condo financial collector. Analyze overdue HOA fees and unpaid balance delinquencies."
                elif "reserve" in clean_type:
                    role_prompt = "You are a condo capital reserve manager. Analyze long-term capital replacement funds and emergency reserves."
                elif "annual" in clean_type or "budget" in clean_type:
                    role_prompt = "You are a condo financial auditor. Analyze year-to-date annual budget performance and budget variance."
                else:
                    role_prompt = "You are a condo financial advisor. Analyze monthly operating income and operational vendor expenses."

                prompt = (
                    f"{role_prompt}\n"
                    f"Report Type: {report_type}\n"
                    f"Period: {period}\n"
                    f"Primary Income/Expected Figure: ${total_income:,.2f}\n"
                    f"Primary Expense/Unpaid/Capital Figure: ${total_expense:,.2f}\n"
                    f"Net Change/Balance Figure: ${net_change:,.2f}\n"
                    f"Breakdown Details: {breakdown_str}\n\n"
                    f"Write a concise 3-sentence executive narrative summarizing key insights and recommended actions."
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash", contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
        except Exception:
            pass

        # Dynamic fallback narratives tailored per report type
        if "delinquency" in clean_type or "delinquent" in clean_type:
            return (
                f"Delinquency & Receivables Report for {period}: Expected HOA assessments total ${total_income:,.2f}, "
                f"with ${total_expense:,.2f} remaining overdue across outstanding accounts. "
                f"Collection notices have been issued to maintain cash flow."
            )

        if "reserve" in clean_type:
            return (
                f"Reserve Fund Health Report for {period}: Association capital reserves hold a total balance of ${total_income:,.2f}. "
                f"Capital expenditures for the period total ${total_expense:,.2f}, preserving an overall reserve net position of ${net_change:,.2f}."
            )

        if "annual" in clean_type or "budget" in clean_type:
            return (
                f"Annual Budget Report (YTD {period}): Cumulative year-to-date revenue reached ${total_income:,.2f} "
                f"against YTD expenditures of ${total_expense:,.2f}, yielding an annual operational variance of ${net_change:,.2f}."
            )

        return (
            f"Monthly Financial Summary for {period}: Total monthly operating income reached ${total_income:,.2f} "
            f"against total operational expenses of ${total_expense:,.2f}, resulting in a net monthly change of ${net_change:,.2f}."
        )

    def get_preview(self, report_type: str, period: str, user_id: Optional[int] = 1) -> dict:
        period_start = f"{period}-01"

        totals = self.repo.get_totals(report_type, period_start)
        line_items = self.repo.get_line_items(report_type, period_start)

        total_income = float(totals.get("total_income") or 0.0)
        total_expense = float(totals.get("total_expense") or 0.0)
        net_change = total_income - total_expense

        ai_summary = self.generate_ai_narrative(
            report_type=report_type,
            period=period,
            total_income=total_income,
            total_expense=total_expense,
            net_change=net_change,
            line_items=line_items,
        )

        # Auto persist into available reports table so it shows up in Available Reports!
        clean_type = report_type.split("(")[0].strip()
        self.repo.insert_report(
            report_type=clean_type,
            period=period,
            file_url=f"/static/reports/{clean_type.replace(' ', '_')}_{period}.pdf",
            file_format="PDF",
            file_size_bytes=1024,
            generated_by=user_id or 1,
        )

        return {
            "report_type": report_type,
            "period": period,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_change": net_change,
            "line_items": line_items,
            "ai_summary": ai_summary,
        }

    def generate_pdf(self, report_type: str, period: str, generated_by: int) -> bytes:
        preview = self.get_preview(report_type, period, user_id=generated_by)
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
        preview = self.get_preview(report_type, period, user_id=generated_by)
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

    def delete_report(self, report_id: int, updated_by: Optional[int] = None) -> bool:
        return self.repo.delete_report(report_id, updated_by)
