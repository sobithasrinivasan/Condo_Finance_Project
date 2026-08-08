from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_STATEMENTS = "bank_statements"
TABLE_TRANSACTIONS = "bank_transactions"

ALLOWED_STATEMENT_STATUSES = {"Processed", "Failed", "Pending"}
ALLOWED_TRANSACTION_TYPES = {"Cheque", "Debit", "Deposit", "ACH"}


@dataclass
class BankTransaction:
    id: int
    bank_statement_id: int
    document_extraction_id: Optional[int]
    transaction_date: date
    description: str
    transaction_type: str
    amount: float
    reference: Optional[str]
    reconciled: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime


@dataclass
class BankStatement:
    id: int
    association_id: int
    document_extraction_id: Optional[int]
    bank_account_id: Optional[int]
    statement_name: str
    statement_period: Optional[date]
    transaction_count: int
    period_month: Optional[int]
    notes: Optional[str]
    file_path: Optional[str]
    uploaded_by: Optional[int]
    uploaded_on: datetime
    status: str
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime