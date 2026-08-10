from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class ReportRequest(BaseModel):
    report_type: str
    period: str


class ReportPreviewLineItem(BaseModel):
    category: str
    amount: Decimal = Decimal("0.00")


class ReportPreview(BaseModel):
    report_type: str
    period: str
    total_income: Decimal = Decimal("0.00")
    total_expense: Decimal = Decimal("0.00")
    net_change: Decimal = Decimal("0.00")
    line_items: list[ReportPreviewLineItem] = []
    ai_summary: Optional[str] = None
