import csv
import io


def build_report_csv(report_data: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    preview = report_data.get("preview") or report_data
    panels = report_data.get("panels") or []

    report_type = str(preview.get("report_type") or "Financial Summary")
    period = str(preview.get("period") or "N/A")
    statement_bal = float(preview.get("statement_balance") or 0.0)
    total_income = float(preview.get("total_income") or 0.0)
    total_expense = float(preview.get("total_expense") or 0.0)
    net_change = float(preview.get("net_change") or (statement_bal + total_income - total_expense))
    ai_summary = str(preview.get("ai_summary") or "")

    stmt_str = f"{statement_bal:.2f}" if statement_bal != 0.0 else "N/A"
    income_str = f"{total_income:.2f}" if total_income != 0.0 else "N/A"
    exp_str = f"{total_expense:.2f}" if total_expense != 0.0 else "N/A"
    net_str = f"{net_change:.2f}" if net_change != 0.0 else "N/A"

    # SECTION 1: EXECUTIVE FINANCIAL OVERVIEW
    writer.writerow(["=== EXECUTIVE FINANCIAL OVERVIEW ==="])
    writer.writerow([
        "Report Name / Type",
        "Reporting Period",
        "Statement Ending Balance ($)",
        "Total Income / Revenue ($)",
        "Total Expenses ($)",
        "Net Reserve Change ($)",
        "Financial Executive Story / AI Summary"
    ])
    writer.writerow([
        report_type,
        period,
        stmt_str,
        income_str,
        exp_str,
        net_str,
        ai_summary
    ])
    writer.writerow([])

    # SECTION 2: EXPENSES CATEGORY BREAKDOWN
    line_items = preview.get("line_items") or []
    if line_items:
        writer.writerow(["=== EXPENSE CATEGORY BREAKDOWN ==="])
        writer.writerow(["Category Name", "Total Amount ($)"])
        for item in line_items:
            cat = str(item.get("category") or "General Expense")
            amt = float(item.get("amount") or 0.0)
            writer.writerow([cat, f"{amt:.2f}"])
        writer.writerow([])

    # SECTION 3+: INDIVIDUAL PANEL DATA TABLES & AI SUMMARIES
    for panel in panels:
        title = panel.get("title") or "Panel Section"
        panel_ai = panel.get("ai_summary") or ""
        writer.writerow([f"=== {title.upper()} ==="])
        if panel_ai:
            writer.writerow(["AI Summary Analysis:", panel_ai])

        metrics = panel.get("metrics") or []
        if metrics:
            m_headers = [str(m[0]) for m in metrics]
            m_values = [str(m[1]) for m in metrics]
            writer.writerow(m_headers)
            writer.writerow(m_values)
            writer.writerow([])

        headers = panel.get("table_headers") or []
        rows = panel.get("table_rows") or []
        if headers and rows:
            writer.writerow(headers)
            for row in rows:
                writer.writerow(row)

        writer.writerow([])

    return output.getvalue()
