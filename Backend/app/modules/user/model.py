from dataclasses import dataclass
from datetime import datetime
from typing import Optional

TABLE_NAME = "users"

# Values must match the ENUM columns defined in the users table.
ALLOWED_ROLES = {"Admin", "Treasurer", "Board_Member"}
ALLOWED_STATUSES = {"Active", "Inactive", "Invited"}


@dataclass
class User:
    id: int
    full_name: str
    email: str
    password_hash: str
    role: str
    phone_number: Optional[str]
    status: str
    two_factor_enabled: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
