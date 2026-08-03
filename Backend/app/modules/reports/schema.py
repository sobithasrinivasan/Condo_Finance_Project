from decimal import Decimal

from pydantic import BaseModel


class ReportRequest(BaseModel):
    report_type: str
    period: str


class ReportPreviewLineItem(BaseModel):
    category: str
    amount: Decimal


class ReportPreview(BaseModel):
    report_type: str
    period: str
    total_income: Decimal
    total_expense: Decimal
    net_change: Decimal
    line_items: list[ReportPreviewLineItem]
    ai_summary: str | None = None
