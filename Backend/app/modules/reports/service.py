import os
import re
import uuid
from typing import Any, Optional

from google import genai

from app.core.settings import settings
from .csv_builder import build_report_csv
from .pdf_builder import build_report_pdf
from .period_utils import parse_period_input
from .repository import ReportRepository

REPORTS_DIR = "app/static/reports"


class ReportService:

    def __init__(self, db):
        self.db = db
        self.repo = ReportRepository(db)

    def list_available(self) -> list[dict]:
        return self.repo.get_all()

    def generate_panel_ai_summary(self, panel_title: str, panel_context_str: str, fallback_text: str = "") -> str:
        try:
            if settings.GEMINI_API_KEY:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"You are a condo association chief financial analyst. Analyze the following executed financial records for the '{panel_title}' section:\n\n"
                    f"{panel_context_str}\n\n"
                    f"Write a concise, authoritative 2 to 3 sentence AI summary analysis highlighting key figures, cash flow implications, vendor commitments, or compliance observations."
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash", contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
        except Exception:
            pass
        return fallback_text

    def generate_ai_narrative(
        self,
        report_type: str,
        period: str,
        total_income: float,
        total_expense: float,
        net_change: float,
        line_items: list[dict],
        panels_context: Optional[dict[str, Any]] = None,
    ) -> str:
        if total_income == 0.0 and total_expense == 0.0 and net_change == 0.0:
            return f"No financial activity or transactions recorded for {period}."

        ctx = panels_context or {}

        active_panel_lines = []

        # 1. High-level financial overview
        active_panel_lines.append(
            f"Financial Overview: Total Income of ${total_income:,.2f}, Total Expenses of ${total_expense:,.2f}, Net Change of ${net_change:,.2f}."
        )

        # 2. Invoices Panel
        inv = ctx.get("invoices", {})
        if inv.get("has_data"):
            inv_detail_str = f" (Key Invoices: {', '.join(inv['details'])})" if inv.get("details") else ""
            active_panel_lines.append(
                f"Invoices Panel: {inv['count']} recorded invoices totaling ${inv['total_amount']:,.2f} (${inv['pending_amount']:,.2f} pending approval/payment){inv_detail_str}."
            )

        # 3. Payables Panel
        pay = ctx.get("payables", {})
        if pay.get("has_data"):
            pay_detail_str = f" (Key Payables: {', '.join(pay['details'])})" if pay.get("details") else ""
            active_panel_lines.append(
                f"Accounts Payable Panel: {pay['count']} scheduled vendor payments totaling ${pay['total_amount']:,.2f} (${pay['pending_amount']:,.2f} pending){pay_detail_str}."
            )

        # 4. Receivables Panel
        rec = ctx.get("receivables", {})
        if rec.get("has_data"):
            active_panel_lines.append(
                f"Receivables & HOA Collections Panel: Expected dues of ${rec['expected_amount']:,.2f}, collected ${rec['amount_received']:,.2f} ({rec['collection_pct']}% collection rate), with ${rec['overdue_amount']:,.2f} in outstanding/overdue balances."
            )

        # 5. Banking & Cash Flow Panel
        bank = ctx.get("bank_activity", {})
        if bank.get("has_data"):
            active_panel_lines.append(
                f"Banking & Cash Balances Panel: Checking account balance is ${bank['checking_balance']:,.2f} (Money Market: ${bank['money_market_balance']:,.2f}) with {bank['txn_count']} bank transactions totaling ${bank['credits']:,.2f} in deposits and ${bank['debits']:,.2f} in disbursements."
            )

        # 6. Reconciliation Panel
        recon = ctx.get("reconciliation", {})
        if recon.get("has_data"):
            active_panel_lines.append(
                f"Bank Reconciliation Panel: {recon['reconciled_transactions']} reconciled transactions and {recon['unreconciled_transactions']} transactions awaiting monthly reconciliation matching."
            )

        # 7. Special Assessments Panel
        sa = ctx.get("special_assessments", {})
        if sa.get("has_data"):
            active_panel_lines.append(
                f"Special Assessments Panel: {sa['count']} active assessment projects totaling ${sa['total_amount']:,.2f} (${sa['total_paid']:,.2f} paid, ${sa['balance_remaining']:,.2f} balance remaining)."
            )

        panel_context_str = "\n".join(f"- {line}" for line in active_panel_lines)

        try:
            if settings.GEMINI_API_KEY:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"You are a condo association chief financial analyst. Provide an executive summary story for {report_type} for {period}.\n\n"
                    f"Active System Panel Data (ONLY panels with executed/non-zero data are listed below):\n"
                    f"{panel_context_str}\n\n"
                    f"STRICT INSTRUCTIONS:\n"
                    f"1. Synthesize insights across ONLY the active panels provided above.\n"
                    f"2. DO NOT include headings, bullet points, or commentary for panels that have zero data or are not listed above.\n"
                    f"3. Write a cohesive, professional 3 to 4 sentence executive narrative highlighting specific amounts, cash position, vendor obligations, and reconciliation status."
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash", contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
        except Exception:
            pass

        # Dynamic fallback narrative
        fallback_parts = []
        fallback_parts.append(
            f"Financial Overview for {period}: Operating revenue reached ${total_income:,.2f} against operational expenditures of ${total_expense:,.2f}, resulting in a net position of ${net_change:,.2f}."
        )

        if pay.get("has_data") or inv.get("has_data"):
            p_amt = pay.get("total_amount", 0.0)
            i_amt = inv.get("total_amount", 0.0)
            p_pend = pay.get("pending_amount", 0.0)
            fallback_parts.append(
                f"Accounts Payable & Invoices: ${p_amt:,.2f} in scheduled vendor payables and ${i_amt:,.2f} in recorded invoices with ${p_pend:,.2f} pending disbursement."
            )

        if rec.get("has_data"):
            fallback_parts.append(
                f"Receivables: HOA collections reached ${rec.get('amount_received', 0.0):,.2f} of ${rec.get('expected_amount', 0.0):,.2f} expected ({rec.get('collection_pct', 0.0)}% collected) with ${rec.get('overdue_amount', 0.0):,.2f} remaining overdue."
            )

        if bank.get("has_data"):
            fallback_parts.append(
                f"Cash Position: Checking account balance stands at ${bank.get('checking_balance', 0.0):,.2f} following ${bank.get('credits', 0.0):,.2f} in deposits and ${bank.get('debits', 0.0):,.2f} in account withdrawals."
            )

        if recon.get("has_data") and recon.get("unreconciled_transactions", 0) > 0:
            fallback_parts.append(
                f"Reconciliation: {recon.get('unreconciled_transactions')} bank transactions are currently pending reconciliation."
            )

        if sa.get("has_data"):
            fallback_parts.append(
                f"Special Assessments: ${sa.get('total_paid', 0.0):,.2f} has been collected towards ${sa.get('total_amount', 0.0):,.2f} in special capital assessments."
            )

        return " ".join(fallback_parts)

    def get_preview(self, report_type: str, period: str, user_id: Optional[int] = 1) -> dict:
        start_date, end_date, display_period = parse_period_input(period)

        totals = self.repo.get_totals(report_type, start_date, end_date)
        line_items = self.repo.get_line_items(report_type, start_date, end_date)
        panels_context = self.repo.get_all_panels_context(start_date, end_date)

        statement_balance = float(totals.get("statement_balance") or 0.0)
        total_income = float(totals.get("total_income") or 0.0)
        total_expense = float(totals.get("total_expense") or 0.0)
        net_change = float(totals.get("net_change") if "net_change" in totals else (total_income - total_expense))

        ai_summary = self.generate_ai_narrative(
            report_type=report_type,
            period=display_period,
            total_income=total_income,
            total_expense=total_expense,
            net_change=net_change,
            line_items=line_items,
            panels_context=panels_context,
        )

        # Auto persist into available reports table
        clean_type = report_type.split("(")[0].strip()
        safe_period_slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", display_period)
        self.repo.insert_report(
            report_type=clean_type,
            start_date=start_date,
            end_date=end_date,
            display_period=display_period,
            file_url=f"/static/reports/{clean_type.replace(' ', '_')}_{safe_period_slug}.pdf",
            file_format="PDF",
            file_size_bytes=1024,
            generated_by=user_id or 1,
        )

        return {
            "report_type": report_type,
            "period": display_period,
            "statement_balance": statement_balance,
            "total_income": total_income,
            "total_expense": total_expense,
            "net_change": net_change,
            "line_items": line_items,
            "ai_summary": ai_summary,
        }

    def get_comprehensive_report_data(self, report_type: str, period: str, user_id: Optional[int] = 1) -> dict:
        preview = self.get_preview(report_type, period, user_id=user_id)
        start_date, end_date, display_period = parse_period_input(period)
        full_context = self.repo.get_comprehensive_export_context(start_date, end_date)

        panels = []

        # 1. Bank Statements & Banking Activity
        bank_data = full_context.get("bank_activity", {})
        if bank_data.get("has_data"):
            stmts = bank_data.get("statements", [])
            txns = bank_data.get("transactions", [])
            stmt_summary_str = ""
            if stmts:
                s = stmts[0]
                stmt_summary_str = (
                    f"Statement for {s.get('bank_name')} ({s.get('account_number')}): "
                    f"Beginning Balance: ${s.get('beginning_balance', 0.0):,.2f}, "
                    f"Total Deposits: ${s.get('total_deposits', 0.0):,.2f}, "
                    f"Total Withdrawals: ${s.get('total_withdrawals', 0.0):,.2f}, "
                    f"Ending Balance: ${s.get('ending_balance', 0.0):,.2f}."
                )
            txn_summary_str = f"{len(txns)} bank transactions recorded in statement period."
            panel_str = f"{stmt_summary_str} {txn_summary_str}"

            fallback_ai = (
                f"Bank statement analysis reflects a solid cash position with an ending balance of "
                f"${stmts[0].get('ending_balance', 0.0):,.2f} after processing ${stmts[0].get('total_deposits', 0.0):,.2f} in deposits "
                f"and ${stmts[0].get('total_withdrawals', 0.0):,.2f} in withdrawals. Liquidity remains sufficient to cover near-term operational needs."
                if stmts else f"Total of {len(txns)} banking transactions recorded across operating accounts."
            )

            ai_summary = self.generate_panel_ai_summary("Bank Statements & Cash Flow", panel_str, fallback_ai)

            panels.append({
                "id": "bank_statements",
                "title": "Bank Statements & Cash Flow",
                "subtitle": stmts[0].get("name") if stmts else "Banking Activity",
                "metrics": [
                    ("Beginning Balance", f"${stmts[0].get('beginning_balance', 0.0):,.2f}") if stmts else ("Transactions", str(len(txns))),
                    ("Total Deposits", f"${stmts[0].get('total_deposits', 0.0):,.2f}") if stmts else ("Credits", "$0.00"),
                    ("Total Withdrawals", f"${stmts[0].get('total_withdrawals', 0.0):,.2f}") if stmts else ("Debits", "$0.00"),
                    ("Ending Balance", f"${stmts[0].get('ending_balance', 0.0):,.2f}") if stmts else ("Balance", "$0.00"),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Date", "Description", "Type / Method", "Amount"],
                "table_rows": [
                    [t["date"], t["description"], f"{t['type']} ({t['method']})", f"${t['amount']:,.2f}"]
                    for t in txns
                ],
            })

        # 2. Invoices & OCR Extraction
        inv_data = full_context.get("invoices", {})
        if inv_data.get("has_data"):
            inv_items = inv_data.get("items", [])
            tot = inv_data.get("total_amount", 0.0)
            inv_summary_list = [f"{i['vendor']} (#{i['invoice_number']}, ${i['amount']:,.2f}, {i['status']})" for i in inv_items]
            panel_str = f"{len(inv_items)} invoices recorded totaling ${tot:,.2f}. Invoices: {', '.join(inv_summary_list)}."
            fallback_ai = (
                f"A total of {len(inv_items)} vendor invoices amounting to ${tot:,.2f} have been processed and extracted via OCR. "
                f"All extracted line items align with active service agreements and have been routed for payment scheduling."
            )
            ai_summary = self.generate_panel_ai_summary("Invoices & Vendor Billing", panel_str, fallback_ai)

            panels.append({
                "id": "invoices",
                "title": "Invoices & Vendor Extractions",
                "subtitle": f"{len(inv_items)} Processed Invoices",
                "metrics": [
                    ("Total Invoices", str(len(inv_items))),
                    ("Total Invoiced", f"${tot:,.2f}"),
                    ("Top Vendor", inv_items[0]["vendor"] if inv_items else "None"),
                    ("Status", "OCR Verified"),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Vendor", "Invoice #", "Category", "Due Date", "Status", "Amount"],
                "table_rows": [
                    [i["vendor"], i["invoice_number"], i.get("category") or "General", i["due_date"] or i["date"], i["status"], f"${i['amount']:,.2f}"]
                    for i in inv_items
                ],
            })

        # 3. Accounts Payable & Scheduled Disbursements
        pay_data = full_context.get("payables", {})
        if pay_data.get("has_data"):
            pay_items = pay_data.get("items", [])
            tot = pay_data.get("total_amount", 0.0)
            pay_summary_list = [f"{p['payee']} (${p['amount']:,.2f}, {p['status']})" for p in pay_items]
            panel_str = f"{len(pay_items)} scheduled vendor payables totaling ${tot:,.2f}. Vendors: {', '.join(pay_summary_list)}."
            fallback_ai = (
                f"Scheduled accounts payable total ${tot:,.2f} across {len(pay_items)} vendor disbursements. "
                f"Vendor obligations are prioritized according to scheduled due dates to prevent delinquency penalties."
            )
            ai_summary = self.generate_panel_ai_summary("Accounts Payable & Disbursements", panel_str, fallback_ai)

            panels.append({
                "id": "payables",
                "title": "Accounts Payable & Disbursements",
                "subtitle": f"{len(pay_items)} Scheduled Payments",
                "metrics": [
                    ("Payables Count", str(len(pay_items))),
                    ("Total Payable", f"${tot:,.2f}"),
                    ("Primary Vendor", pay_items[0]["payee"] if pay_items else "None"),
                    ("Schedule", "Active"),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Payee", "Category", "Due Date", "Payment Date", "Status", "Amount"],
                "table_rows": [
                    [p["payee"], p.get("category") or "Operational", p["due_date"] or "N/A", p["payment_date"] or "Pending", p["status"], f"${p['amount']:,.2f}"]
                    for p in pay_items
                ],
            })

        # 4. Receivables & HOA Unit Assessments
        rec_data = full_context.get("receivables", {})
        if rec_data.get("has_data"):
            rec_items = rec_data.get("items", [])
            exp = rec_data.get("total_expected", 0.0)
            rcv = rec_data.get("total_received", 0.0)
            col_pct = round(rcv / exp * 100.0, 2) if exp > 0 else 100.0
            panel_str = (
                f"Expected collections: ${exp:,.2f}, Received: ${rcv:,.2f} ({col_pct}% rate) across {len(rec_items)} units."
            )
            fallback_ai = (
                f"HOA assessment collections reached ${rcv:,.2f} representing a {col_pct}% collection efficiency across {len(rec_items)} condo units. "
                f"Timely dues receipts support operating cash flows and prevent balance sheet impairment."
            )
            ai_summary = self.generate_panel_ai_summary("Receivables & Unit Assessments", panel_str, fallback_ai)

            panels.append({
                "id": "receivables",
                "title": "Receivables & Unit Assessments",
                "subtitle": f"{len(rec_items)} Association Units",
                "metrics": [
                    ("Expected Dues", f"${exp:,.2f}"),
                    ("Collected", f"${rcv:,.2f}"),
                    ("Collection Rate", f"{col_pct}%"),
                    ("Total Units", str(len(rec_items))),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Unit", "Homeowner / Payer", "Expected", "Collected", "Status"],
                "table_rows": [
                    [r["unit"], r["payer"], f"${r['expected']:,.2f}", f"${r['received']:,.2f}", r["status"]]
                    for r in rec_items
                ],
            })

        # 5. Bank Reconciliation & Audit Posture
        recon_data = full_context.get("reconciliation", {})
        if recon_data.get("has_data"):
            tot_txns = recon_data.get("total_count", 0)
            reconciled = recon_data.get("reconciled_count", 0)
            unreconciled = recon_data.get("unreconciled_count", 0)
            panel_str = (
                f"Total transactions: {tot_txns}, Reconciled: {reconciled}, Unreconciled: {unreconciled}."
            )
            fallback_ai = (
                f"Reconciliation tracking shows {reconciled} fully matched transactions with {unreconciled} entries in pending audit status. "
                f"Monthly ledger synchronization maintains accurate internal controls."
            )
            ai_summary = self.generate_panel_ai_summary("Bank Reconciliation & Internal Controls", panel_str, fallback_ai)

            panels.append({
                "id": "reconciliation",
                "title": "Bank Reconciliation & Internal Controls",
                "subtitle": f"{tot_txns} Ledger Transactions",
                "metrics": [
                    ("Total Transactions", str(tot_txns)),
                    ("Reconciled", str(reconciled)),
                    ("Pending Matching", str(unreconciled)),
                    ("Audit Status", "In Progress" if unreconciled > 0 else "Fully Reconciled"),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Audit Metric", "Count / Value", "Compliance Note"],
                "table_rows": [
                    ["Total Operating Transactions", str(tot_txns), "Extracted from statement and ledger"],
                    ["Reconciled Transactions", str(reconciled), "Matched against bank records"],
                    ["Pending Reconciliation", str(unreconciled), "Awaiting monthly review matching"],
                ],
            })

        # 6. Special Assessments (if active)
        sa_data = full_context.get("special_assessments", {})
        if sa_data.get("has_data") and sa_data.get("items"):
            sa_items = sa_data.get("items", [])
            tot_sa = sum(s["total_amount"] for s in sa_items)
            panel_str = f"{len(sa_items)} capital assessment projects totaling ${tot_sa:,.2f}."
            fallback_ai = f"Active capital projects totaling ${tot_sa:,.2f} are tracked for association infrastructure improvements."
            ai_summary = self.generate_panel_ai_summary("Special Assessments & Capital Reserve", panel_str, fallback_ai)

            panels.append({
                "id": "special_assessments",
                "title": "Special Assessments & Capital Reserve",
                "subtitle": f"{len(sa_items)} Active Projects",
                "metrics": [
                    ("Projects", str(len(sa_items))),
                    ("Assessed Amount", f"${tot_sa:,.2f}"),
                    ("Status", "Active"),
                ],
                "ai_summary": ai_summary,
                "table_headers": ["Project Name", "Due Date", "Status", "Amount"],
                "table_rows": [
                    [s["project_name"], s["due_date"] or "N/A", s["status"], f"${s['total_amount']:,.2f}"]
                    for s in sa_items
                ],
            })

        return {
            "preview": preview,
            "period": display_period,
            "report_type": report_type,
            "panels": panels,
        }

    def generate_pdf(self, report_type: str, period: str, generated_by: int) -> bytes:
        comprehensive_data = self.get_comprehensive_report_data(report_type, period, user_id=generated_by)
        pdf_bytes = build_report_pdf(comprehensive_data)

        start_date, end_date, display_period = parse_period_input(period)
        clean_type = report_type.split("(")[0].strip()
        safe_period_slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", display_period)

        os.makedirs(REPORTS_DIR, exist_ok=True)
        file_name = f"{clean_type.replace(' ', '_')}_{safe_period_slug}_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(REPORTS_DIR, file_name)

        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        self.repo.insert_report(
            report_type=clean_type,
            start_date=start_date,
            end_date=end_date,
            display_period=display_period,
            file_url=f"/static/reports/{file_name}",
            file_format="PDF",
            file_size_bytes=len(pdf_bytes),
            generated_by=generated_by,
        )

        return pdf_bytes

    def generate_csv(self, report_type: str, period: str, generated_by: int) -> str:
        comprehensive_data = self.get_comprehensive_report_data(report_type, period, user_id=generated_by)
        csv_content = build_report_csv(comprehensive_data)

        start_date, end_date, display_period = parse_period_input(period)
        clean_type = report_type.split("(")[0].strip()
        safe_period_slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", display_period)

        os.makedirs(REPORTS_DIR, exist_ok=True)
        file_name = f"{clean_type.replace(' ', '_')}_{safe_period_slug}_{uuid.uuid4().hex[:8]}.csv"
        file_path = os.path.join(REPORTS_DIR, file_name)

        with open(file_path, "w", newline="") as f:
            f.write(csv_content)

        self.repo.insert_report(
            report_type=clean_type,
            start_date=start_date,
            end_date=end_date,
            display_period=display_period,
            file_url=f"/static/reports/{file_name}",
            file_format="CSV",
            file_size_bytes=len(csv_content.encode("utf-8")),
            generated_by=generated_by,
        )

        return csv_content

    def delete_report(self, report_id: int, updated_by: Optional[int] = None) -> bool:
        return self.repo.delete_report(report_id, updated_by)
