from pydantic import BaseModel, EmailStr
from typing import Optional


class VendorCreate(BaseModel):
    name: str
    category: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[str] = None


class VendorResponse(BaseModel):
    id: int
    name: str
    category: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    status: str