from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

TABLE_NAME = "reconciliations"

from .constants import (
    RECORD_TYPES,
    RECONCILIATION_STATUSES,
    RECONCILIATION_METHODS,
)


@dataclass
class ReconciliationRecord:
    id: int
    association_id: int
    bank_transaction_id: int
    record_type: str
    record_id: Optional[int]
    status: str
    method: str
    matched_by: Optional[int]
    matched_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
