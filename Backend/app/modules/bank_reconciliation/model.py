from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

TABLE_NAME = "reconciliation_records"

from .constants import (
    RECONCILIATION_TYPES,
    PAYMENT_STATUSES,
    RECONCILIATION_STATUSES,
)


@dataclass
class ReconciliationRecord:
    id: int
    bank_transaction_id: int
    reconciliation_type: str
    reference_id: Optional[int]
    payment_status: str
    match_score: Optional[Decimal]
    status: str
    resolution_notes: Optional[str]
    matched_by: Optional[int]
    matched_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
