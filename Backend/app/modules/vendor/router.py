from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from . import service, schema

router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"]
)


@router.get("/", response_model=list[schema.VendorResponse])
def get_vendors(db: Session = Depends(get_db)):
    return service.get_vendors(db)


@router.get("/{vendor_id}", response_model=schema.VendorResponse)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    return service.get_vendor(db, vendor_id)


@router.post("/", response_model=schema.VendorResponse)
def create_vendor(
    vendor: schema.VendorCreate,
    db: Session = Depends(get_db)
):
    return service.create_vendor(db, vendor)


@router.put("/{vendor_id}", response_model=schema.VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor: schema.VendorUpdate,
    db: Session = Depends(get_db)
):
    return service.update_vendor(db, vendor_id, vendor)


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    return service.delete_vendor(db, vendor_id)