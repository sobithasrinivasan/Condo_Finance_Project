from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "invoices"

ALLOWED_STATUSES = {"Pending", "Approved", "Paid", "Rejected", "Duplicate"}
ALLOWED_SOURCES = {"Manual", "Gmail Import", "OCR"}

DECISION_STATUSES = {"Approved", "Rejected"}


@dataclass
class Invoice:
    id: int
    invoice_number: str
    vendor_id: int
    amount: float
    invoice_date: date
    due_date: Optional[date]
    status: str
    source: str
    gmail_message_id: Optional[str]
    ocr_confidence: Optional[float]
    document_url: Optional[str]
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    paid_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
