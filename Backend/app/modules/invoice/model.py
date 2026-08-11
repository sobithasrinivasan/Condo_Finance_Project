from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "invoices"

ALLOWED_STATUSES = {"Pending", "Approved", "Paid", "Rejected", "Duplicate"}
ALLOWED_SOURCES = {"Manual", "Gmail_Import"}

DECISION_STATUSES = {"Approved", "Rejected"}


@dataclass
class Invoice:
    id: int
    association_id: int
    vendor_id: Optional[int]
    document_extraction_id: Optional[int]
    invoice_number: str
    invoice_date: date
    due_date: Optional[date]
    amount: float
    status: str
    source: str
    gmail_import_id: Optional[int]
    attachment_path: Optional[str]
    document_url: Optional[str]
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime
