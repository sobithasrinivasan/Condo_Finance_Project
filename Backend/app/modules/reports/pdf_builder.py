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
 
    y -= 0.4 * inch
    if preview.get("ai_summary"):
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(1 * inch, y, "Financial Executive Story")
        y -= 0.25 * inch
        pdf.setFont("Helvetica-Oblique", 9)
        words = preview["ai_summary"].split(" ")
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
    pdf.drawString(1 * inch, y, f"Financial Overview Chart ({preview['period']})")
    y -= 0.3 * inch

    chart_base_y = y - 1.8 * inch
    max_val = max(abs(float(preview["total_income"])), abs(float(preview["total_expense"])), abs(float(preview["net_change"])), 100.0)
    
    bars = [
        ("Total Income", float(preview["total_income"]), (0.1, 0.34, 0.86)),
        ("Total Expense", float(preview["total_expense"]), (0.0, 0.73, 0.62)),
        ("Net Change", float(preview["net_change"]), (0.31, 0.27, 0.71)),
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

    pdf.setFillColorRGB(0, 0, 0)
    pdf.save()
    buffer.seek(0)
    return buffer.read()