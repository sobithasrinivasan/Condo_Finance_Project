from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .model import ALLOWED_INSTRUMENTS, ALLOWED_STATUSES


class ReceivableCreate(BaseModel):
    association_id: int = Field(gt=0)
    document_extraction_id: Optional[int] = Field(None, gt=0)
    unit_id: Optional[int] = Field(None, gt=0)
    from_payer: str = Field(max_length=190)
    due_date: date
    expected_amount: float = Field(ge=0)
    amount_received: float = Field(default=0.0, ge=0)
    balance_amount: Optional[float] = None
    deposit_month: Optional[date] = None
    instrument: Optional[str] = Field(default=None, max_length=20)
    paid_date: Optional[date] = None
    status: str = Field(default="Pending", max_length=20)
    bank: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(default="HOA Deposit", max_length=255)
    assessment_allocation_id: Optional[int] = Field(None, gt=0)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("instrument")
    @classmethod
    def validate_instrument(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_INSTRUMENTS:
            raise ValueError(f"instrument must be one of: {', '.join(sorted(ALLOWED_INSTRUMENTS))}.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v


class ReceivableUpdate(BaseModel):
    document_extraction_id: Optional[int] = Field(None, gt=0)
    unit_id: Optional[int] = Field(None, gt=0)
    from_payer: Optional[str] = Field(None, max_length=190)
    due_date: Optional[date] = None
    expected_amount: Optional[float] = Field(None, ge=0)
    amount_received: Optional[float] = Field(None, ge=0)
    balance_amount: Optional[float] = None
    deposit_month: Optional[date] = None
    instrument: Optional[str] = Field(None, max_length=20)
    paid_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    bank: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("instrument")
    @classmethod
    def validate_instrument(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_INSTRUMENTS:
            raise ValueError(f"instrument must be one of: {', '.join(sorted(ALLOWED_INSTRUMENTS))}.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class ReceivableResponse(BaseModel):
    id: int
    association_id: int
    document_extraction_id: Optional[int] = None
    unit_id: Optional[int] = None
    from_payer: str
    due_date: date
    expected_amount: float
    amount_received: float
    balance_amount: Optional[float] = None
    deposit_month: Optional[date] = None
    instrument: Optional[str] = None
    paid_date: Optional[date] = None
    status: str
    bank: Optional[str] = None
    description: Optional[str] = None
    assessment_allocation_id: Optional[int] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceivableFilters(BaseModel):
    association_id: Optional[int] = None
    document_extraction_id: Optional[int] = None
    unit_id: Optional[int] = None
    from_payer: Optional[str] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    deposit_month_from: Optional[date] = None
    deposit_month_to: Optional[date] = None
    instrument: Optional[str] = None
    status: Optional[str] = None
    bank: Optional[str] = None
    description: Optional[str] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class GenerateMonthlyRequest(BaseModel):
    association_id: int = Field(gt=0)
    month: date  # First day of the month (e.g. 2026-08-01)

    model_config = ConfigDict(str_strip_whitespace=True)


class GenerateYearlyRequest(BaseModel):
    association_id: int = Field(gt=0)
    year: int = Field(ge=2020, le=2100)

    model_config = ConfigDict(str_strip_whitespace=True)