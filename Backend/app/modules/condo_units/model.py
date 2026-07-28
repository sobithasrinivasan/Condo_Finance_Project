from dataclasses import dataclass
from datetime import datetime
from typing import Optional

TABLE_NAME = "condo_units"

ALLOWED_STATUSES = {"Active", "Inactive"}


@dataclass
class CondoUnit:
    id: int
    unit_number: str
    owner_name: str
    owner_email: Optional[str]
    owner_phone: Optional[str]
    monthly_hoa_amount: float
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
