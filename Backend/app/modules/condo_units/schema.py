from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .model import ALLOWED_STATUSES, ALLOWED_UNIT_TYPES


class CondoUnitCreate(BaseModel):
    association_id: int = Field(..., gt=0)
    unit_number: str = Field(..., max_length=30)
    owner_name: str = Field(..., max_length=150)
    owner_email: Optional[EmailStr] = Field(None, max_length=190)
    owner_phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    unit_type: str = Field(default="Standard", max_length=50)
    monthly_hoa_amount: float = Field(..., gt=0)
    due_date: date
    status: str = Field("Active", max_length=20)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v

    @field_validator("unit_type")
    @classmethod
    def validate_unit_type(cls, v: str) -> str:
        if v not in ALLOWED_UNIT_TYPES:
            raise ValueError(f"unit_type must be one of: {', '.join(sorted(ALLOWED_UNIT_TYPES))}.")
        return v


class CondoUnitUpdate(BaseModel):
    unit_number: Optional[str] = Field(None, max_length=30)
    owner_name: Optional[str] = Field(None, max_length=150)
    owner_email: Optional[EmailStr] = Field(None, max_length=190)
    owner_phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    unit_type: Optional[str] = Field(None, max_length=50)
    monthly_hoa_amount: Optional[float] = Field(None, gt=0)
    due_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v

    @field_validator("unit_type")
    @classmethod
    def validate_unit_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_UNIT_TYPES:
            raise ValueError(f"unit_type must be one of: {', '.join(sorted(ALLOWED_UNIT_TYPES))}.")
        return v

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class CondoUnitResponse(BaseModel):
    id: int
    association_id: int
    unit_number: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    address: Optional[str] = None
    unit_type: str = "Standard"
    monthly_hoa_amount: float
    due_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class CondoUnitFilters(BaseModel):
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None
    unit_type: Optional[str] = None
    status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
