from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_STATEMENTS = "bank_statements"
TABLE_TRANSACTIONS = "bank_transactions"

ALLOWED_STATEMENT_STATUSES = {"Processing", "Processed", "Failed"}
ALLOWED_TRANSACTION_TYPES = {"Credit", "Debit"}


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
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int


@dataclass
class BankStatement:
    id: int
    file_name: str
    period_month: int
    period_year: int
    uploaded_by: int
    status: str
    transaction_count: int
    error_message: Optional[str]
    file_url: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
