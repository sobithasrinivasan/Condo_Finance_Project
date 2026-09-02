from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LoginCreate(BaseModel):
    role: str
    email: EmailStr
    password_hash: str
    created_by: Optional[int] = None


class LoginResponse(BaseModel):
    id: int
    role: str
    email: EmailStr
    status: str
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool