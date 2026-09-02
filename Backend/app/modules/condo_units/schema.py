from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .model import ALLOWED_STATUSES


class CondoUnitCreate(BaseModel):
    association_id: int = Field(..., gt=0)
    unit_number: str = Field(..., max_length=30)
    owner_name: str = Field(..., max_length=150)
    owner_email: Optional[EmailStr] = Field(None, max_length=190)
    owner_phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    monthly_hoa_amount: float = Field(..., gt=0)
    status: str = Field("Active", max_length=20)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v


class CondoUnitUpdate(BaseModel):
    unit_number: Optional[str] = Field(None, max_length=30)
    owner_name: Optional[str] = Field(None, max_length=150)
    owner_email: Optional[EmailStr] = Field(None, max_length=190)
    owner_phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    monthly_hoa_amount: Optional[float] = Field(None, gt=0)
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
    monthly_hoa_amount: float
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
    status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
