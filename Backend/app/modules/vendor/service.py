from fastapi import HTTPException

from . import repository, schema


def get_vendors():
    return repository.get_all()


def get_vendor(vendor_id: int):
    vendor = repository.get_by_id(vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return vendor


def create_vendor(vendor: schema.VendorCreate):
    return repository.create(vendor.model_dump())


def update_vendor(vendor_id: int, vendor_data: schema.VendorUpdate):
    vendor = repository.get_by_id(vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    updated_data = vendor.copy()

    for key, value in vendor_data.model_dump(exclude_unset=True).items():
        updated_data[key] = value

    return repository.update(vendor_id, updated_data)


def delete_vendor(vendor_id: int):
    vendor = repository.get_by_id(vendor_id)

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return repository.delete(vendor_id)