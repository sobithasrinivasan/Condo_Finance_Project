from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .model import ALLOWED_SOURCES, ALLOWED_STATUSES


class InvoiceUpdate(BaseModel):
    """
    PATCH /invoices/{id} - body.
    Any column on the table can be edited. `status` is how a user
    approves/rejects an invoice (Pending -> Approved | Rejected | Paid | Duplicate).
    approved_by / approved_at / paid_at are set automatically by the
    service based on the status transition - do not pass them directly.
    """

    invoice_number: Optional[str] = Field(None, max_length=50)
    vendor_id: Optional[int] = Field(None, gt=0)
    amount: Optional[float] = Field(None, gt=0)
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[str] = Field(
        None,
        description="Pending | Approved | Paid | Rejected | Duplicate. "
                    "Set to Approved/Rejected to record the user's decision."
    )
    source: Optional[str] = Field(None, max_length=20)
    gmail_message_id: Optional[str] = Field(None, max_length=255)
    ocr_confidence: Optional[float] = Field(None, ge=0, le=100)
    document_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}.")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in ALLOWED_SOURCES:
            raise ValueError(f"source must be one of: {', '.join(sorted(ALLOWED_SOURCES))}.")
        return v

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    vendor_id: int
    amount: float
    invoice_date: date
    due_date: Optional[date] = None
    days_left: Optional[int] = Field(
        None, description="due_date - invoice_date, in days."
    )
    status: str
    source: str
    gmail_message_id: Optional[str] = None
    ocr_confidence: Optional[float] = None
    document_url: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool
    version: int

    model_config = ConfigDict(from_attributes=True)


class InvoiceFilters(BaseModel):
    invoice_number: Optional[str] = None
    vendor_id: Optional[int] = None
    status: Optional[str] = None
    source: Optional[str] = None
    gmail_message_id: Optional[str] = None
    approved_by: Optional[int] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None
    invoice_date_from: Optional[date] = None
    invoice_date_to: Optional[date] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    created_from: Optional[date] = None
    created_to: Optional[date] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
