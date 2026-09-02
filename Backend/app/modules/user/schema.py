from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .model import ALLOWED_ROLES, ALLOWED_STATUSES


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr = Field(..., max_length=190)
    password: str = Field(..., min_length=8, description="Plain-text password. Hashed before storage after bcrypt.")
    role: str = Field("Board_Member", max_length=20)
    status: str = Field("Active", max_length=20)
    phone_number: Optional[str] = Field(None, max_length=30)
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

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        return stripped or None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = Field(None, max_length=190)
    password: Optional[str] = Field(None, min_length=8, description="If set, replaces the stored password.")
    role: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = Field(None, max_length=20)
    phone_number: Optional[str] = Field(None, max_length=30)
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

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        return stripped or None

    def get_update_fields(self) -> dict:
        # Keep an explicitly provided `phone_number` (including None to clear it),
        # and drop every other field that is either unset or None.
        data = self.model_dump(exclude_unset=True)
        return {
            k: v
            for k, v in data.items()
            if v is not None or k == "phone_number"
        }


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    status: str
    phone_number: Optional[str] = None
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
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
