from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BankTransactionResponse(BaseModel):
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
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class BankStatementResponse(BaseModel):
    id: int
    file_name: str
    period_month: int
    period_year: int
    uploaded_by: int
    status: str
    transaction_count: int
    error_message: Optional[str] = None
    file_url: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int
    transactions: list[BankTransactionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class BankStatementFilters(BaseModel):
    file_name: Optional[str] = None
    period_month: Optional[int] = Field(None, ge=1, le=12)
    period_year: Optional[int] = None
    uploaded_by: Optional[int] = None
    status: Optional[str] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_from: Optional[date] = None
    created_to: Optional[date] = None


    transaction_type: Optional[str] = None
    description: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    transaction_date_from: Optional[date] = None
    transaction_date_to: Optional[date] = None
    ocr_verified: Optional[bool] = None
    reconciled: Optional[bool] = None

    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
