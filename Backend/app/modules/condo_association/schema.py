from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .model import ALLOWED_STATUSES


class CondoAssociationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=190)
    address: str = Field(..., min_length=1, max_length=255)
    established: Optional[int] = Field(None, ge=1900, le=2100)
    unit_count: int = Field(8, ge=1, le=255)
    status: str = Field("Active", max_length=20)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v


class CondoAssociationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=190)
    address: Optional[str] = Field(None, min_length=1, max_length=255)
    established: Optional[int] = Field(None, ge=1900, le=2100)
    unit_count: Optional[int] = Field(None, ge=1, le=255)
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


class CondoAssociationResponse(BaseModel):
    id: int
    name: str
    address: str
    established: Optional[int] = None
    unit_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class CondoAssociationFilters(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

