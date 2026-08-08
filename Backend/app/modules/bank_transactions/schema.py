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
    document_extraction_id: Optional[int] = None
    transaction_type: Optional[str] = None
    description: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    transaction_date_from: Optional[date] = None
    transaction_date_to: Optional[date] = None
    reconciled: Optional[bool] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)