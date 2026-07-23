"""Row-level constants and typing for the `users` table."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

TABLE_NAME = "users"

ALLOWED_ROLES = {"Admin", "Treasurer", "Board Member"}
ALLOWED_STATUSES = {"Active", "Inactive", "Suspended"}


@dataclass
class User:
    id: int
    name: str
    email: str
    password_hash: str
    role: str
    status: str
    avatar_url: Optional[str]
    two_factor_enabled: bool
    last_login_at: Optional[datetime]
    remember_token: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]
    is_active: bool
    version: int
