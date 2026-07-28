from dataclasses import dataclass
from typing import Optional


@dataclass
class Vendor:
    id: Optional[int] = None
    name: str = ""
    category: str = ""
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    status: str = "Active"