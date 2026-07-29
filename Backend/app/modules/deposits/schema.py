from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DepositRecord(BaseModel):
    id: int
    bank_transaction_id: int
    reconciliation_type: str
    reference_id: Optional[int] = None
    payment_status: str
    match_score: Optional[float] = None
    status: str
    resolution_notes: Optional[str] = None
    matched_date: Optional[datetime] = None
    created_at: datetime
    transaction_date: Optional[date] = None
    transaction_amount: Optional[float] = None
    transaction_description: Optional[str] = None
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None
    monthly_hoa_amount: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class DepositSummary(BaseModel):
    total_units: int
    total_expected: float
    total_received: float
    outstanding_balance: float
    total_deposits: int
    matched_count: int
    needs_review_count: int

    model_config = ConfigDict(from_attributes=True)


class DepositUpdateRequest(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class DepositFilters(BaseModel):
    unit_id: Optional[int] = None
    deposit_month: Optional[int] = Field(None, ge=1, le=12)
    deposit_year: Optional[int] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
