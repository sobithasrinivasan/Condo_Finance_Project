from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssessmentStatus(str, Enum):
    UPCOMING = "Upcoming"
    ACTIVE = "Active"
    COMPLETED = "Completed"


class AllocationStatus(str, Enum):
    PENDING = "Pending"
    PARTIAL = "Partial"
    PAID = "Paid"


# ── Request Models ────────────────────────────────────────────────────

class AllocationInput(BaseModel):
    """Per-unit allocation (for custom amounts)."""
    unit_id: int = Field(gt=0)
    allocated_amount: float = Field(gt=0)


class CreateAssessmentRequest(BaseModel):
    """Create a special assessment. Allocations are either equal split or custom per-unit."""
    association_id: int = Field(gt=0)
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    total_amount: float = Field(gt=0)
    due_date: date
    status: AssessmentStatus = Field(default=AssessmentStatus.ACTIVE)
    # If allocations provided, use custom amounts; otherwise equal split across all active units
    allocations: Optional[list[AllocationInput]] = None

    model_config = ConfigDict(str_strip_whitespace=True)


class AssessmentUpdateRequest(BaseModel):
    """Update assessment parent or allocation status."""
    status: Optional[AssessmentStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class AllocationUpdateRequest(BaseModel):
    """Update a specific allocation (e.g., mark as Paid)."""
    status: Optional[AllocationStatus] = None
    paid_amount: Optional[float] = Field(None, ge=0)

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class CreateAllocationRequest(BaseModel):
    """Create an allocation for an existing assessment."""
    unit_id: int = Field(gt=0)
    allocated_amount: float = Field(gt=0)

    model_config = ConfigDict(str_strip_whitespace=True)


# ── Response Models ───────────────────────────────────────────────────

class AllocationResponse(BaseModel):
    id: int
    assessment_id: int
    unit_id: int
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None
    allocated_amount: float
    paid_amount: float
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentResponse(BaseModel):
    id: int
    association_id: int
    title: str
    description: Optional[str] = None
    total_amount: float
    due_date: date
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    # Computed fields
    total_units: Optional[int] = None
    paid_units: Optional[int] = None
    total_collected: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class CreateAssessmentResponse(BaseModel):
    assessment: AssessmentResponse
    allocations: list[AllocationResponse]

    model_config = ConfigDict(from_attributes=True)


class AssessmentSummary(BaseModel):
    total_active_assessments: int = 0
    pending_collection: float = 0.0
    collected_ytd: float = 0.0
    total_records: int = 0
    paid_count: int = 0
    outstanding_count: int = 0
    upcoming_due_date: Optional[str] = None
    upcoming_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssessmentFilters(BaseModel):
    association_id: Optional[int] = None
    status: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
