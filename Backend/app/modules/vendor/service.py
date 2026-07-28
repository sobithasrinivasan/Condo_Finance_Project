from sqlalchemy.orm import Session
from . import repository, schema, models
from fastapi import HTTPException


def get_vendors(db: Session):
    return repository.get_all(db)


def get_vendor(db: Session, vendor_id: int):
    vendor = repository.get_by_id(db, vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return vendor


def create_vendor(db: Session, vendor: schema.VendorCreate):
    new_vendor = models.Vendor(**vendor.model_dump())
    return repository.create(db, new_vendor)


def update_vendor(db: Session, vendor_id: int, vendor_data: schema.VendorUpdate):

    vendor = repository.get_by_id(db, vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = vendor_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(vendor, key, value)

    return repository.update(db, vendor)


def delete_vendor(db: Session, vendor_id: int):

    vendor = repository.get_by_id(db, vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    repository.delete(db, vendor)

    return {"message": "Vendor deleted successfully"}