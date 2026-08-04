from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssessmentStatus(str, Enum):
    PAID = "Paid"
    LATE = "Late"
    PARTIAL = "Partial"


class AssessmentRecord(BaseModel):
    id: int
    bank_transaction_id: int
    reconciliation_type: str
    reference_id: Optional[int] = None
    payment_status: str
    match_score: Optional[float] = None
    status: str
    resolution_notes: Optional[str] = None
    matched_date: Optional[datetime] = None
    created_at: datetime
    transaction_date: Optional[date] = None
    transaction_amount: Optional[float] = None
    transaction_description: Optional[str] = None
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentSummary(BaseModel):
    total_assessments: int
    total_collected: float
    matched_count: int
    needs_review_count: int

    model_config = ConfigDict(from_attributes=True)


class AssessmentUpdateRequest(BaseModel):
    status: AssessmentStatus  # Required: Paid, Late, or Partial

    def get_update_fields(self) -> dict:
        return {"status": self.status.value}


class CreateAssessmentStatus(str, Enum):
    ACTIVE = "Active"
    PENDING = "Pending"


class CreateAssessmentRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Assessment title (e.g., Elevator Maintenance)")
    description: Optional[str] = Field(None, description="Brief description of the assessment purpose")
    amount: float = Field(..., gt=0, description="Assessment amount per unit")
    due_date: date = Field(..., description="Payment deadline")
    status: CreateAssessmentStatus = Field(CreateAssessmentStatus.ACTIVE, description="Initial status")

    model_config = ConfigDict(from_attributes=True)


class CreateAssessmentUnitRecord(BaseModel):
    id: int
    unit_id: int
    unit_number: str
    owner_name: str
    amount: float
    status: str

    model_config = ConfigDict(from_attributes=True)


class CreateAssessmentResponse(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_date: date
    status: str
    total_units: int
    assessments: list[CreateAssessmentUnitRecord]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssessmentFilters(BaseModel):
    unit_id: Optional[int] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)