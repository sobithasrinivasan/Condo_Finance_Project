import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


def wrap_text_into_lines(text: str, max_chars: int = 90) -> list[str]:
    """Helper to cleanly wrap multi-line text into lines without breaking words."""
    lines: list[str] = []
    for paragraph in str(text).split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        words = paragraph.split(" ")
        current_line = ""
        for word in words:
            if not current_line:
                current_line = word
            elif len(current_line + " " + word) <= max_chars:
                current_line += " " + word
            else:
                lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
    return lines


def wrap_cell_text(text: str, max_chars: int) -> list[str]:
    """Helper to wrap table cell text onto multiple lines without truncating."""
    text = str(text).strip()
    if not text:
        return [""]
    if len(text) <= max_chars:
        return [text]
    words = text.split(" ")
    lines = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur + " " + w) <= max_chars:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def get_column_specs(panel_id: str, headers: list[str]) -> list[dict]:
    """Returns exact x positions and max characters per column to prevent any overlap."""
    if "payable" in panel_id:
        return [
            {"x": 0.8 * inch, "max_chars": 20},  # Payee
            {"x": 2.6 * inch, "max_chars": 18},  # Category
            {"x": 4.1 * inch, "max_chars": 12},  # Due Date
            {"x": 4.95 * inch, "max_chars": 12}, # Payment Date
            {"x": 5.85 * inch, "max_chars": 10}, # Status
            {"x": 6.6 * inch, "max_chars": 12},  # Amount
        ]
    elif "invoice" in panel_id:
        return [
            {"x": 0.8 * inch, "max_chars": 20},  # Vendor
            {"x": 2.6 * inch, "max_chars": 12},  # Invoice #
            {"x": 3.6 * inch, "max_chars": 17},  # Category
            {"x": 5.0 * inch, "max_chars": 12},  # Due Date
            {"x": 5.9 * inch, "max_chars": 10},  # Status
            {"x": 6.65 * inch, "max_chars": 12}, # Amount
        ]
    elif "bank" in panel_id:
        return [
            {"x": 0.8 * inch, "max_chars": 12},  # Date
            {"x": 1.7 * inch, "max_chars": 32},  # Description
            {"x": 4.7 * inch, "max_chars": 18},  # Type / Method
            {"x": 6.5 * inch, "max_chars": 12},  # Amount
        ]
    elif "receivable" in panel_id:
        return [
            {"x": 0.8 * inch, "max_chars": 12},  # Unit
            {"x": 1.7 * inch, "max_chars": 20},  # Payer
            {"x": 3.5 * inch, "max_chars": 12},  # Expected
            {"x": 4.5 * inch, "max_chars": 12},  # Received
            {"x": 5.5 * inch, "max_chars": 12},  # Balance
            {"x": 6.5 * inch, "max_chars": 10},  # Status
        ]
    elif "special" in panel_id:
        return [
            {"x": 0.8 * inch, "max_chars": 32},  # Project Name
            {"x": 3.7 * inch, "max_chars": 14},  # Due Date
            {"x": 4.9 * inch, "max_chars": 12},  # Status
            {"x": 6.2 * inch, "max_chars": 14},  # Total Amount
        ]
    else:
        col_count = max(len(headers), 1)
        col_w = 6.7 * inch / col_count
        char_cap = max(int(col_w / (0.08 * inch)), 8)
        return [{"x": 0.8 * inch + i * col_w, "max_chars": char_cap} for i in range(col_count)]


def build_report_pdf(report_data: dict) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    preview = report_data.get("preview") or report_data
    panels = report_data.get("panels") or []

    statement_bal = float(preview.get("statement_balance") or 0.0)
    total_income = float(preview.get("total_income") or 0.0)
    total_expense = float(preview.get("total_expense") or 0.0)
    net_change = float(preview.get("net_change") or (statement_bal + total_income - total_expense))
    period_str = str(preview.get("period") or "N/A")
    report_title = str(preview.get("report_type") or "Financial Summary")

    # ==========================================
    # PAGE 1: EXECUTIVE FINANCIAL OVERVIEW
    # ==========================================
    y = 10.2 * inch
    pdf.setFillColorRGB(0.1, 0.15, 0.25)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(0.8 * inch, y, report_title)
    y -= 0.25 * inch

    pdf.setFont("Helvetica", 10)
    pdf.setFillColorRGB(0.4, 0.45, 0.55)
    pdf.drawString(0.8 * inch, y, f"Reporting Period: {period_str}  |  Bayshore Terrace Condominium Association")
    y -= 0.50 * inch

    # Top Metrics Grid
    metrics = [
        ("Statement Balance", statement_bal, (0.2, 0.25, 0.35)),
        ("Total Income", total_income, (0.05, 0.55, 0.35)),
        ("Total Expense", total_expense, (0.85, 0.25, 0.25)),
        ("Net Change", net_change, (0.1, 0.34, 0.86) if net_change >= 0 else (0.85, 0.25, 0.25)),
    ]

    card_width = 1.6 * inch
    spacing = 1.7 * inch
    for i, (label, val, col) in enumerate(metrics):
        cx = 0.8 * inch + i * spacing
        pdf.setFillColorRGB(0.96, 0.97, 0.99)
        pdf.setStrokeColorRGB(0.88, 0.90, 0.94)
        pdf.setLineWidth(0.75)
        pdf.roundRect(cx, y - 0.45 * inch, card_width, 0.55 * inch, 4, fill=1, stroke=1)

        pdf.setFillColorRGB(0.45, 0.5, 0.6)
        pdf.setFont("Helvetica-Bold", 7.5)
        pdf.drawString(cx + 0.1 * inch, y - 0.05 * inch, label.upper())

        pdf.setFillColorRGB(*col)
        pdf.setFont("Helvetica-Bold", 11)
        val_text = f"${val:,.2f}" if val != 0.0 else "N/A"
        pdf.drawString(cx + 0.1 * inch, y - 0.32 * inch, val_text)

    y -= 0.70 * inch

    # Executive AI Story Box (Dynamic Height)
    if preview.get("ai_summary"):
        story_lines = wrap_text_into_lines(str(preview["ai_summary"]), max_chars=90)
        line_height = 0.15 * inch
        header_height = 0.28 * inch
        bottom_pad = 0.12 * inch
        box_height = header_height + (len(story_lines) * line_height) + bottom_pad

        pdf.setFillColorRGB(0.94, 0.97, 1.0)
        pdf.setStrokeColorRGB(0.75, 0.85, 0.98)
        pdf.setLineWidth(0.75)
        pdf.roundRect(0.8 * inch, y - box_height, 6.7 * inch, box_height, 4, fill=1, stroke=1)

        pdf.setFillColorRGB(0.1, 0.3, 0.7)
        pdf.setFont("Helvetica-Bold", 9.5)
        pdf.drawString(1.0 * inch, y - 0.18 * inch, "EXECUTIVE FINANCIAL STORY (AI SYNTHESIS)")

        pdf.setFillColorRGB(0.2, 0.25, 0.35)
        pdf.setFont("Helvetica-Oblique", 8.5)
        story_y = y - 0.35 * inch
        for line in story_lines:
            pdf.drawString(1.0 * inch, story_y, line)
            story_y -= line_height

        y -= (box_height + 0.28 * inch)

    # Overview Chart
    if y < 2.5 * inch:
        pdf.showPage()
        y = 10.2 * inch

    pdf.setFillColorRGB(0.1, 0.15, 0.25)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(0.8 * inch, y, f"Financial Overview Chart ({period_str})")
    y -= 0.2 * inch

    chart_base_y = y - 1.25 * inch
    max_val = max(abs(statement_bal), abs(total_income), abs(total_expense), abs(net_change), 100.0)

    bars = [
        ("Statement Bal", statement_bal, (0.3, 0.35, 0.45)),
        ("Total Income", total_income, (0.05, 0.55, 0.35)),
        ("Total Expense", total_expense, (0.85, 0.25, 0.25)),
        ("Net Change", net_change, (0.1, 0.34, 0.86) if net_change >= 0 else (0.85, 0.25, 0.25)),
    ]

    pdf.setStrokeColorRGB(0.85, 0.88, 0.92)
    pdf.setLineWidth(0.5)
    pdf.line(0.8 * inch, chart_base_y, 7.5 * inch, chart_base_y)

    bar_width = 0.55 * inch
    b_spacing = 6.4 * inch / max(len(bars), 1)

    for i, (label, val, color) in enumerate(bars):
        bx = 1.1 * inch + i * b_spacing
        h_ratio = min(max(abs(val) / max_val, 0.05), 1.0)
        h = h_ratio * 0.95 * inch

        pdf.setFillColorRGB(*color)
        pdf.rect(bx, chart_base_y, bar_width, h, fill=1, stroke=0)

        pdf.setFillColorRGB(0.2, 0.25, 0.3)
        pdf.setFont("Helvetica-Bold", 7.5)
        val_str = f"${val:,.2f}" if val != 0.0 else "N/A"
        pdf.drawCentredString(bx + bar_width / 2.0, chart_base_y + h + 0.05 * inch, val_str)

        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawCentredString(bx + bar_width / 2.0, chart_base_y - 0.16 * inch, label)

    y = chart_base_y - 0.40 * inch

    # Expenses Category Breakdown Table (With Word Wrapping)
    line_items = preview.get("line_items") or []
    if line_items:
        if y < 1.8 * inch:
            pdf.showPage()
            y = 10.2 * inch

        pdf.setFillColorRGB(0.1, 0.15, 0.25)
        pdf.setFont("Helvetica-Bold", 10.5)
        pdf.drawString(0.8 * inch, y, "Expenses Category Breakdown")
        y -= 0.22 * inch

        pdf.setFont("Helvetica-Bold", 8.5)
        pdf.setFillColorRGB(0.4, 0.45, 0.55)
        pdf.drawString(0.8 * inch, y, "Category")
        pdf.drawString(5.5 * inch, y, "Amount")

        line_y = y - 0.05 * inch
        pdf.setStrokeColorRGB(0.85, 0.88, 0.92)
        pdf.setLineWidth(0.5)
        pdf.line(0.8 * inch, line_y, 7.5 * inch, line_y)

        y = line_y - 0.16 * inch

        pdf.setFont("Helvetica", 8.0)
        pdf.setFillColorRGB(0.15, 0.2, 0.25)
        for item in line_items[:6]:
            cat = str(item.get("category") or "General Expense")
            amt = float(item.get("amount") or 0.0)
            cat_lines = wrap_cell_text(cat, max_chars=40)
            item_h = len(cat_lines) * 0.12 * inch

            for li, c_l in enumerate(cat_lines):
                pdf.drawString(0.8 * inch, y - li * 0.11 * inch, c_l)

            pdf.drawString(5.5 * inch, y, f"${amt:,.2f}")
            y -= max(item_h, 0.16 * inch)

        y -= 0.20 * inch

    # ==========================================
    # CONTINUOUS MULTI-PANEL REPORT FLOW
    # ==========================================
    for panel in panels:
        if y < 2.6 * inch:
            pdf.showPage()
            y = 10.2 * inch
        else:
            pdf.setStrokeColorRGB(0.90, 0.92, 0.95)
            pdf.setLineWidth(0.5)
            pdf.line(0.8 * inch, y, 7.5 * inch, y)
            y -= 0.25 * inch

        # Section Header
        pdf.setFillColorRGB(0.1, 0.15, 0.25)
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(0.8 * inch, y, panel["title"])
        y -= 0.20 * inch

        pdf.setFont("Helvetica", 9.0)
        pdf.setFillColorRGB(0.45, 0.5, 0.6)
        pdf.drawString(0.8 * inch, y, f"{panel.get('subtitle', '')}  |  Period: {period_str}")
        y -= 0.28 * inch

        # Metrics Callout Row (Word Wrapped)
        metrics = panel.get("metrics") or []
        if metrics:
            m_width = 6.7 * inch / max(len(metrics), 1)
            for mi, (m_lbl, m_val) in enumerate(metrics):
                mx = 0.8 * inch + mi * m_width
                pdf.setFillColorRGB(0.97, 0.98, 0.99)
                pdf.setStrokeColorRGB(0.88, 0.90, 0.94)
                pdf.setLineWidth(0.5)
                pdf.roundRect(mx, y - 0.42 * inch, m_width - 0.1 * inch, 0.52 * inch, 3, fill=1, stroke=1)

                pdf.setFillColorRGB(0.45, 0.5, 0.6)
                pdf.setFont("Helvetica-Bold", 7)
                pdf.drawString(mx + 0.08 * inch, y - 0.06 * inch, str(m_lbl).upper()[:22])

                val_lines = wrap_cell_text(str(m_val), max_chars=16)
                pdf.setFillColorRGB(0.1, 0.15, 0.25)
                if len(val_lines) == 1:
                    pdf.setFont("Helvetica-Bold", 8.5)
                    pdf.drawString(mx + 0.08 * inch, y - 0.29 * inch, val_lines[0])
                else:
                    pdf.setFont("Helvetica-Bold", 7.5)
                    pdf.drawString(mx + 0.08 * inch, y - 0.23 * inch, val_lines[0])
                    pdf.drawString(mx + 0.08 * inch, y - 0.35 * inch, val_lines[1])

            y -= 0.58 * inch

        # AI Summary Analysis Box
        if panel.get("ai_summary"):
            ai_lines = wrap_text_into_lines(str(panel["ai_summary"]), max_chars=92)
            ai_line_height = 0.14 * inch
            ai_hdr_height = 0.24 * inch
            ai_bottom_pad = 0.10 * inch
            ai_box_height = ai_hdr_height + (len(ai_lines) * ai_line_height) + ai_bottom_pad

            if y - ai_box_height < 1.0 * inch:
                pdf.showPage()
                y = 10.2 * inch

            pdf.setFillColorRGB(0.96, 0.98, 1.0)
            pdf.setStrokeColorRGB(0.8, 0.88, 0.98)
            pdf.setLineWidth(0.75)
            pdf.roundRect(0.8 * inch, y - ai_box_height, 6.7 * inch, ai_box_height, 4, fill=1, stroke=1)

            pdf.setFillColorRGB(0.1, 0.35, 0.75)
            pdf.setFont("Helvetica-Bold", 8.5)
            pdf.drawString(1.0 * inch, y - 0.15 * inch, "AI SUMMARY ANALYSIS")

            pdf.setFillColorRGB(0.2, 0.25, 0.35)
            pdf.setFont("Helvetica-Oblique", 8.0)
            text_y = y - 0.30 * inch
            for line in ai_lines:
                pdf.drawString(1.0 * inch, text_y, line)
                text_y -= ai_line_height

            y -= (ai_box_height + 0.22 * inch)

        # Panel Data Table (With Full Word Wrapping)
        headers = panel.get("table_headers") or []
        rows = panel.get("table_rows") or []

        if headers and rows:
            if y < 1.5 * inch:
                pdf.showPage()
                y = 10.2 * inch

            pdf.setFillColorRGB(0.1, 0.15, 0.25)
            pdf.setFont("Helvetica-Bold", 9.5)
            pdf.drawString(0.8 * inch, y, "Itemized Execution Records")
            y -= 0.18 * inch

            col_specs = get_column_specs(panel.get("id", ""), headers)

            # Table Header Function
            def draw_table_headers(cur_y: float) -> float:
                pdf.setFont("Helvetica-Bold", 8.0)
                pdf.setFillColorRGB(0.4, 0.45, 0.55)
                for hi, h in enumerate(headers):
                    spec = col_specs[hi] if hi < len(col_specs) else {"x": 0.8 * inch + hi * 1.1 * inch, "max_chars": 15}
                    pdf.drawString(spec["x"], cur_y, str(h))

                l_y = cur_y - 0.05 * inch
                pdf.setStrokeColorRGB(0.85, 0.88, 0.92)
                pdf.setLineWidth(0.5)
                pdf.line(0.8 * inch, l_y, 7.5 * inch, l_y)
                return l_y - 0.16 * inch

            y = draw_table_headers(y)

            pdf.setFont("Helvetica", 7.5)
            for row_idx, row in enumerate(rows):
                # Wrap each cell into lines
                wrapped_cells = []
                for ci, cell in enumerate(row):
                    spec = col_specs[ci] if ci < len(col_specs) else {"x": 0.8 * inch + ci * 1.1 * inch, "max_chars": 15}
                    wrapped_cells.append(wrap_cell_text(cell, spec["max_chars"]))

                max_cell_lines = max((len(c_lines) for c_lines in wrapped_cells), default=1)
                row_height = max_cell_lines * 0.12 * inch + 0.03 * inch

                if y - row_height < 0.85 * inch:
                    pdf.showPage()
                    y = 10.2 * inch
                    y = draw_table_headers(y)
                    pdf.setFont("Helvetica", 7.5)

                if row_idx % 2 == 1:
                    pdf.setFillColorRGB(0.98, 0.98, 0.99)
                    pdf.rect(0.8 * inch, y - row_height + 0.02 * inch, 6.7 * inch, row_height, fill=1, stroke=0)

                pdf.setFillColorRGB(0.2, 0.25, 0.3)
                for ci, c_lines in enumerate(wrapped_cells):
                    spec = col_specs[ci] if ci < len(col_specs) else {"x": 0.8 * inch + ci * 1.1 * inch, "max_chars": 15}
                    for li, line_text in enumerate(c_lines):
                        pdf.drawString(spec["x"], y - li * 0.11 * inch, line_text)

                y -= row_height

            y -= 0.25 * inch

    pdf.save()
    buffer.seek(0)
    return buffer.read()