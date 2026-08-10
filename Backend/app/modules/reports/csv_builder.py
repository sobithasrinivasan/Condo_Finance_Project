import csv
import io


def build_report_csv(preview: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    report_type = str(preview.get("report_type") or "Financial Summary")
    period = str(preview.get("period") or "N/A")
    total_income = float(preview.get("total_income") or 0.0)
    total_expense = float(preview.get("total_expense") or 0.0)
    net_change = float(preview.get("net_change") or (total_income - total_expense))
    ai_summary = str(preview.get("ai_summary") or "")

    # Transposed Summary Table with Descriptive Column Headers
    writer.writerow([
        "Report Name / Type",
        "Reporting Period (YYYY-MM)",
        "Total Income / Revenue ($)",
        "Total Expenses ($)",
        "Net Reserve Change ($)",
        "Financial Executive Story / AI Summary"
    ])
    writer.writerow([
        report_type,
        period,
        f"{total_income:.2f}",
        f"{total_expense:.2f}",
        f"{net_change:.2f}",
        ai_summary
    ])

    writer.writerow([])

    # Descriptive Category Breakdown Table
    writer.writerow([
        "Expense Category Name",
        "Category Total Amount ($)"
    ])
    line_items = preview.get("line_items") or []
    if line_items:
        for item in line_items:
            cat = str(item.get("category") or "General Expense")
            amt = float(item.get("amount") or 0.0)
            writer.writerow([cat, f"{amt:.2f}"])
    else:
        writer.writerow(["No categorized expenses recorded", "0.00"])

    return output.getvalue()
