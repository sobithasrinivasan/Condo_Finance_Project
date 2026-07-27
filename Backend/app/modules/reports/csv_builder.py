import csv
import io


def build_report_csv(preview: dict) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([preview["report_type"]])
    writer.writerow(["Period", preview["period"]])
    writer.writerow([])
    writer.writerow(["Total Income", f"{preview['total_income']:.2f}"])
    writer.writerow(["Total Expense", f"{preview['total_expense']:.2f}"])
    writer.writerow(["Net Change", f"{preview['net_change']:.2f}"])
    writer.writerow([])
    writer.writerow(["Category", "Amount"])
    for item in preview["line_items"]:
        writer.writerow([item["category"], f"{item['amount']:.2f}"])

    return output.getvalue()
