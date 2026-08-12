from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

TABLE_NAME = "condo_units"

ALLOWED_STATUSES = {"Active", "Inactive"}
ALLOWED_UNIT_TYPES = {"Standard", "Corner", "Penthouse", "Garden", "Duplex", "Loft"}


@dataclass
class CondoUnit:
    id: int
    association_id: int
    unit_number: str
    owner_name: str
    owner_email: Optional[str]
    owner_phone: Optional[str]
    address: Optional[str]
    unit_type: str
    monthly_hoa_amount: float
    due_date: date
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
