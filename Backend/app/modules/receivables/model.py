from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "receivables"

ALLOWED_INSTRUMENTS = {"ACH", "Cheque", "Card", "Cash", "Other"}
ALLOWED_STATUSES = {"Pending", "Partial", "Received", "Overdue"}


@dataclass
class Receivable:
    id: int
    association_id: int
    document_extraction_id: Optional[int]
    unit_id: Optional[int]
    from_payer: str
    due_date: date
    expected_amount: float
    amount_received: float
    balance_amount: Optional[float]
    deposit_month: Optional[date]
    instrument: Optional[str]
    paid_date: Optional[date]
    status: str
    bank: Optional[str]
    assessment_allocation_id: Optional[int]
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime