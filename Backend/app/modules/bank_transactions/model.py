from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "bank_transactions"

ALLOWED_TYPES = {"Credit", "Debit"}


@dataclass
class BankTransaction:
    id: int
    bank_statement_id: int
    transaction_date: date
    description: str
    amount: float
    type: str
    ocr_verified: bool
    reconciled: bool
    created_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    updated_at: datetime
    is_active: bool
    version: int
