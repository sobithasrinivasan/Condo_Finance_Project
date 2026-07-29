import io
 
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
 
 
def build_report_pdf(preview: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
 
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(1 * inch, 10 * inch, preview["report_type"])
 
    pdf.setFont("Helvetica", 11)
    pdf.drawString(1 * inch, 9.7 * inch, f"Period: {preview['period']}")
 
    y = 9.2 * inch
    pdf.setFont("Helvetica", 11)
    pdf.drawString(1 * inch, y, f"Total Income: ${preview['total_income']:,.2f}")
    y -= 0.25 * inch
    pdf.drawString(1 * inch, y, f"Total Expense: ${preview['total_expense']:,.2f}")
    y -= 0.25 * inch
    pdf.drawString(1 * inch, y, f"Net Change: ${preview['net_change']:,.2f}")
 
    y -= 0.5 * inch
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(1 * inch, y, "Breakdown by Category")
 
    y -= 0.3 * inch
    pdf.setFont("Helvetica", 10)
    for item in preview["line_items"]:
        if y < 1 * inch:
            pdf.showPage()
            y = 10 * inch
        pdf.drawString(1 * inch, y, item["category"])
        pdf.drawRightString(6 * inch, y, f"${item['amount']:,.2f}")
        y -= 0.22 * inch
 
    pdf.save()
    buffer.seek(0)
    return buffer.read()