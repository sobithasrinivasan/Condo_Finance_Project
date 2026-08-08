from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReconciliationRequest(BaseModel):
    """Request to reconcile a single bank transaction."""

    bank_transaction_id: int = Field(..., gt=0)


class BatchReconciliationRequest(BaseModel):
    """Request to reconcile all unreconciled transactions for one or more statements."""

    bank_statement_ids: list[int] = Field(..., min_length=1)


class GeminiReconciliationResult(BaseModel):
    """Expected JSON response returned by Gemini."""

    transaction_id: int
    transaction_type: str
    matched_record_type: Optional[str] = None
    matched_record_id: Optional[int] = None
    confidence_score: int = Field(..., ge=0, le=100)
    reconciliation_status: str
    vendor_match: bool
    amount_match: bool
    date_consistent: bool = True
    payment_timing: str
    reasoning: list[str]

    model_config = ConfigDict(extra="forbid")


class ReconciliationResponse(BaseModel):
    """API response after reconciliation completes."""

    id: int
    bank_transaction_id: int
    reconciliation_type: str
    reference_id: Optional[int] = None
    payment_status: str
    match_score: Optional[float] = None
    status: str
    resolution_notes: Optional[str] = None
    matched_by: Optional[int] = None
    matched_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    version: Optional[int] = None

    # Enriched fields - transaction details
    transaction_description: Optional[str] = None
    transaction_amount: Optional[float] = None
    transaction_type: Optional[str] = None
    transaction_date: Optional[date] = None

    # Enriched fields - matched record details
    matched_record_name: Optional[str] = None
    matched_record_description: Optional[str] = None
    unit_number: Optional[str] = None
    owner_name: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReconciliationUpdateRequest(BaseModel):
    """Manual resolution of a reconciliation record."""

    status: Optional[str] = None
    resolution_notes: Optional[str] = None
    reconciliation_type: Optional[str] = None
    reference_id: Optional[int] = None

    def get_update_fields(self) -> dict:
        return self.model_dump(exclude_unset=True, exclude_none=True)


class ExportRequest(BaseModel):
    """Request to export reconciliation report."""

    format: str = Field(..., pattern="^(pdf|excel|csv)$")
    sections: list[str] = Field(default=["matched", "unmatched", "manuallyResolved"])
    bank_statement_id: Optional[int] = None
    bank_statement_ids: Optional[list[int]] = None
    include_audit: bool = False

    def get_statement_ids(self) -> Optional[list[int]]:
        """Return consolidated list of statement IDs from either field."""
        if self.bank_statement_ids:
            return self.bank_statement_ids
        if self.bank_statement_id is not None:
            return [self.bank_statement_id]
        return None


class ReconciliationFilters(BaseModel):
    bank_statement_id: Optional[int] = None
    reconciliation_type: Optional[str] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    is_active: bool = True
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)