from sqlalchemy.orm import Session
from .models import Vendor


def get_all(db: Session):
    return db.query(Vendor).all()


def get_by_id(db: Session, vendor_id: int):
    return db.query(Vendor).filter(Vendor.id == vendor_id).first()


def create(db: Session, vendor: Vendor):
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def update(db: Session, vendor: Vendor):
    db.commit()
    db.refresh(vendor)
    return vendor


def delete(db: Session, vendor: Vendor):
    db.delete(vendor)
    db.commit()