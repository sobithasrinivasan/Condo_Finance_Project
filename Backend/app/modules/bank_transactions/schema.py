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
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    is_active: bool
    version: int

    # Enriched fields from reconciliation
    reconciliation_id: Optional[int] = None
    reconciliation_type: Optional[str] = None
    reconciliation_status: Optional[str] = None
    match_score: Optional[float] = None
    matched_record_name: Optional[str] = None
    payment_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BankTransactionFilters(BaseModel):
    bank_statement_id: Optional[int] = None
    type: Optional[str] = None
    reconciled: Optional[bool] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)
