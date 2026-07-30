from sqlalchemy import Column, Integer, String, Enum, TIMESTAMP, text
from app.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"
    TABLE_NAME = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    address = Column(String(255))
    status = Column(
        Enum("Active", "Inactive"),
        nullable=False,
        server_default="Active"
    )
    created_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    )