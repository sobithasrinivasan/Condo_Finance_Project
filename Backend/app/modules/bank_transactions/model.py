from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "bank_transactions"

# transaction_type = accounting direction; transaction_method = how it moved.
ALLOWED_TYPES = {"Credit", "Debit"}
ALLOWED_METHODS = {"Cheque", "Debit", "Deposit", "ACH", "Other"}


@dataclass
class BankTransaction:
    id: int
    bank_statement_id: int
    document_extraction_id: Optional[int]
    transaction_date: date
    description: str
    transaction_type: str
    transaction_method: Optional[str]
    amount: float
    reference: Optional[str]
    reconciled: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime