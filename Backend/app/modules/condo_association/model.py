from dataclasses import dataclass
from datetime import datetime
from typing import Optional

TABLE_NAME = "condo_associations"

# Values must match the ENUM column defined in the condo_associations table.
ALLOWED_STATUSES = {"Active", "Inactive"}


@dataclass
class CondoAssociation:
    id: int
    name: str
    address: str
    established: Optional[int]
    unit_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int

