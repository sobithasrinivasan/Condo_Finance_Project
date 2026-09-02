from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "payables"

ALLOWED_INSTRUMENTS = {"ACH", "Cheque", "Card", "Cash", "Other"}
ALLOWED_STATUSES = {"Pending", "partial", "Paid", "Overdue"}


@dataclass
class Payable:
    id: int
    association_id: int
    vendor_id: Optional[int]
    document_extraction_id: Optional[int]
    invoice_reference_number: Optional[str]
    pay_to: str
    date_of_payment: date
    amount: float
    due_date: date
    instrument: str
    status: str
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime