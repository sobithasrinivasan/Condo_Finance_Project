from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BankTransactionResponse(BaseModel):
    id: int
    bank_statement_id: int
    document_extraction_id: Optional[int] = None
    transaction_date: date
    description: str
    transaction_type: str
    amount: float
    reference: Optional[str] = None
    reconciled: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class BankStatementResponse(BaseModel):
    id: int
    association_id: int
    document_extraction_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    statement_name: str
    statement_period: Optional[date] = None
    transaction_count: int
    period_month: Optional[int] = None
    notes: Optional[str] = None
    file_path: Optional[str] = None
    uploaded_by: Optional[int] = None
    uploaded_on: datetime
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int
    transactions: list[BankTransactionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class BankStatementFilters(BaseModel):
    association_id: Optional[int] = None
    document_extraction_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    statement_name: Optional[str] = None
    statement_period: Optional[date] = None
    period_month: Optional[int] = Field(None, ge=1, le=12)
    uploaded_by: Optional[int] = None
    status: Optional[str] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_from: Optional[datetime] = None
    created_to: Optional[datetime] = None

    transaction_type: Optional[str] = None
    description: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    transaction_date_from: Optional[date] = None
    transaction_date_to: Optional[date] = None
    reconciled: Optional[bool] = None

    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)