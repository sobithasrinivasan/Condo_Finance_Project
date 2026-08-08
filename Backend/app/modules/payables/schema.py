from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .model import ALLOWED_INSTRUMENTS, ALLOWED_STATUSES


class PayableCreate(BaseModel):
    association_id: int = Field(..., gt=0)
    vendor_id: Optional[int] = Field(None, gt=0)
    document_extraction_id: Optional[int] = Field(None, gt=0)
    pay_to: str = Field(..., max_length=190)
    date_of_payment: date
    amount: float = Field(0.00, ge=0)
    due_date: date
    instrument: str = Field("ACH", max_length=20)
    status: str = Field("Pending", max_length=20)
    created_by: Optional[int] = Field(None, gt=0)
    updated_by: Optional[int] = Field(None, gt=0)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("instrument")
    @classmethod
    def validate_instrument(cls, v: str) -> str:
        if v not in ALLOWED_INSTRUMENTS:
            raise ValueError(f"instrument must be one of: {', '.join(sorted(ALLOWED_INSTRUMENTS))}.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v


class PayableUpdate(BaseModel):
    association_id: Optional[int] = Field(None, gt=0)
    vendor_id: Optional[int] = Field(None, gt=0)
    document_extraction_id: Optional[int] = Field(None, gt=0)
    pay_to: Optional[str] = Field(None, max_length=190)
    date_of_payment: Optional[date] = None
    amount: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None
    instrument: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    updated_by: Optional[int] = Field(None, gt=0)

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


class PayableResponse(BaseModel):
    id: int
    association_id: int
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    document_extraction_id: Optional[int] = None
    pay_to: str
    date_of_payment: date
    amount: float
    due_date: date
    instrument: str
    status: str
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayableFilters(BaseModel):
    association_id: Optional[int] = None
    vendor_id: Optional[int] = None
    document_extraction_id: Optional[int] = None
    pay_to: Optional[str] = None
    status: Optional[str] = None
    instrument: Optional[str] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    date_of_payment_from: Optional[date] = None
    date_of_payment_to: Optional[date] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    created_from: Optional[date] = None
    created_to: Optional[date] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)