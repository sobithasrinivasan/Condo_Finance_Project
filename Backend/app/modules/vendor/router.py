from fastapi import APIRouter

from . import service, schema

router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"]
)


@router.get("/", response_model=list[schema.VendorResponse])
def get_vendors():
    return service.get_vendors()


@router.get("/{vendor_id}", response_model=schema.VendorResponse)
def get_vendor(vendor_id: int):
    return service.get_vendor(vendor_id)


@router.post("/", response_model=schema.VendorResponse)
def create_vendor(vendor: schema.VendorCreate):
    return service.create_vendor(vendor)


@router.put("/{vendor_id}", response_model=schema.VendorResponse)
def update_vendor(
    vendor_id: int,
    vendor: schema.VendorUpdate
):
    return service.update_vendor(vendor_id, vendor)


@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int):
    return service.delete_vendor(vendor_id)