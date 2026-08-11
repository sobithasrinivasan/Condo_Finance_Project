from fastapi import HTTPException

from . import repository, schema


def get_vendors():
    return repository.get_all()


def get_vendor(vendor_id: int):
    vendor = repository.get_by_id(vendor_id)

    if vendor is None:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return vendor


def create_vendor(vendor: schema.VendorCreate):
    return repository.create(
        vendor.model_dump()
    )


def update_vendor(
    vendor_id: int,
    vendor: schema.VendorUpdate
):
    updated_vendor = repository.update(
        vendor_id,
        vendor.model_dump(exclude_unset=True)
    )

    if updated_vendor is None:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return updated_vendor


def delete_vendor(vendor_id: int):
    result = repository.delete(vendor_id)

    if not result["success"]:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return result