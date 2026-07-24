from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .model import ALLOWED_ROLES, ALLOWED_STATUSES


class UserCreate(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, description="Plain-text password. Hashed before storage.")
    role: str = Field("Board Member", max_length=20)
    status: str = Field("Active", max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    two_factor_enabled: bool = False

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8, description="If set, replaces the stored password.")
    role: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    two_factor_enabled: Optional[bool] = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}.")
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


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    avatar_url: Optional[str] = None
    two_factor_enabled: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class UserFilters(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
