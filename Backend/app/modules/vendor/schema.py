from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class VendorCreate(BaseModel):
    association_id: int
    vendor_name: str
    category: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tin_number: Optional[str] = None
    payment_terms: Optional[str] = None
    account_reference: Optional[str] = None


class VendorUpdate(BaseModel):
    vendor_name: Optional[str] = None
    category: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tin_number: Optional[str] = None
    payment_terms: Optional[str] = None
    account_reference: Optional[str] = None
    status: Optional[str] = None


class VendorResponse(BaseModel):
    id: int
    association_id: int
    vendor_name: str
    category: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tin_number: Optional[str] = None
    payment_terms: Optional[str] = None
    account_reference: Optional[str] = None
    status: str
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True