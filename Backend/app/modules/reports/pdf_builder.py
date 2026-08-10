import io

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


def build_report_pdf(preview: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    total_income = float(preview.get("total_income") or 0.0)
    total_expense = float(preview.get("total_expense") or 0.0)
    net_change = float(preview.get("net_change") or (total_income - total_expense))

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(1 * inch, 10 * inch, str(preview.get("report_type") or "Financial Summary"))

    pdf.setFont("Helvetica", 11)
    pdf.drawString(1 * inch, 9.7 * inch, f"Period: {preview.get('period') or 'N/A'}")

    y = 9.2 * inch
    pdf.setFont("Helvetica", 11)
    pdf.drawString(1 * inch, y, f"Total Income: ${total_income:,.2f}")
    y -= 0.25 * inch
    pdf.drawString(1 * inch, y, f"Total Expense: ${total_expense:,.2f}")
    y -= 0.25 * inch

    # Set Net Change text color dynamically
    if net_change < 0:
        pdf.setFillColorRGB(0.88, 0.18, 0.18)  # Red
    elif net_change > 0:
        pdf.setFillColorRGB(0.04, 0.65, 0.44)  # Green
    else:
        pdf.setFillColorRGB(0.1, 0.34, 0.86)   # Blue

    pdf.drawString(1 * inch, y, f"Net Change: ${net_change:,.2f}")
    pdf.setFillColorRGB(0, 0, 0)  # Reset to Black

    y -= 0.4 * inch
    if preview.get("ai_summary"):
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(1 * inch, y, "Financial Executive Story")
        y -= 0.25 * inch
        pdf.setFont("Helvetica-Oblique", 9)
        words = str(preview["ai_summary"]).split(" ")
        line = ""
        for word in words:
            if len(line + " " + word) > 75:
                pdf.drawString(1 * inch, y, line)
                y -= 0.18 * inch
                line = word
            else:
                line = (line + " " + word).strip()
        if line:
            pdf.drawString(1 * inch, y, line)
            y -= 0.25 * inch

    y -= 0.4 * inch
    if y < 3.5 * inch:
        pdf.showPage()
        y = 10 * inch

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(1 * inch, y, f"Financial Overview Chart ({preview.get('period')})")
    y -= 0.3 * inch

    chart_base_y = y - 1.8 * inch
    max_val = max(abs(total_income), abs(total_expense), abs(net_change), 100.0)

    # Dynamic color for Net Change bar
    net_change_color = (
        (0.88, 0.18, 0.18) if net_change < 0 else
        (0.04, 0.65, 0.44) if net_change > 0 else
        (0.1, 0.34, 0.86)
    )

    bars = [
        ("Total Income", total_income, (0.1, 0.34, 0.86)),
        ("Total Expense", total_expense, (0.0, 0.73, 0.62)),
        ("Net Change", net_change, net_change_color),
    ]

    pdf.setStrokeColorRGB(0.85, 0.85, 0.85)
    pdf.setLineWidth(0.5)
    pdf.line(1 * inch, chart_base_y, 6.5 * inch, chart_base_y)

    bar_width = 0.6 * inch
    spacing = 1.8 * inch

    for i, (label, val, color) in enumerate(bars):
        x = 1.4 * inch + i * spacing
        h_ratio = min(max(abs(val) / max_val, 0.05), 1.0)
        h = h_ratio * 1.4 * inch

        pdf.setFillColorRGB(*color)
        pdf.rect(x, chart_base_y, bar_width, h, fill=1, stroke=0)

        pdf.setFillColorRGB(0.2, 0.2, 0.2)
        pdf.setFont("Helvetica-Bold", 8)
        val_str = f"${val:,.2f}"
        pdf.drawCentredString(x + bar_width / 2.0, chart_base_y + h + 0.08 * inch, val_str)

        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawCentredString(x + bar_width / 2.0, chart_base_y - 0.2 * inch, label)

    # Line Items Breakdown Table
    line_items = preview.get("line_items") or []
    if line_items:
        table_y = chart_base_y - 0.6 * inch
        if table_y < 2.0 * inch:
            pdf.showPage()
            table_y = 10 * inch

        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(1 * inch, table_y, "Expenses Category Breakdown")
        table_y -= 0.3 * inch

        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(1 * inch, table_y, "Category")
        pdf.drawString(5 * inch, table_y, "Amount")
        table_y -= 0.2 * inch
        pdf.line(1 * inch, table_y + 0.05 * inch, 6.5 * inch, table_y + 0.05 * inch)

        pdf.setFont("Helvetica", 9)
        for item in line_items:
            if table_y < 1.0 * inch:
                pdf.showPage()
                table_y = 10 * inch
                pdf.setFont("Helvetica", 9)
            cat = str(item.get("category") or "General Expense")
            amt = float(item.get("amount") or 0.0)
            pdf.drawString(1 * inch, table_y, cat)
            pdf.drawString(5 * inch, table_y, f"${amt:,.2f}")
            table_y -= 0.2 * inch

    pdf.setFillColorRGB(0, 0, 0)
    pdf.save()
    buffer.seek(0)
    return buffer.read()