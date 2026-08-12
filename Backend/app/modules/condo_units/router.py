import math
from typing import Optional

from fastapi import APIRouter, Query, status

from app.core.database import get_db_connection

from .schema import CondoUnitCreate, CondoUnitResponse, CondoUnitUpdate
from .service import CondoUnitService

router = APIRouter(prefix="/condo-units", tags=["Condo Units"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new condo unit")
def create_unit(payload: CondoUnitCreate, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = CondoUnitService(db)
        unit = service.create_unit(payload, created_by=created_by)
        return CondoUnitResponse.model_validate(unit).model_dump(mode="json")
    finally:
        db.close()


@router.get("", summary="List condo units")
def list_units(
    association_id: Optional[int] = None,
    unit_number: Optional[str] = None,
    owner_name: Optional[str] = None,
    unit_type: Optional[str] = None,
    status_: Optional[str] = Query(None, alias="status"),
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = CondoUnitService(db)
        rows, total = service.list_units(
            association_id=association_id,
            unit_number=unit_number,
            owner_name=owner_name,
            unit_type=unit_type,
            status=status_,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        data = [CondoUnitResponse.model_validate(r).model_dump(mode="json") for r in rows]
        return {
            "data": data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }
    finally:
        db.close()


@router.get("/{unit_id}", summary="Get a single condo unit")
def get_unit(unit_id: int):
    db = get_db_connection()
    try:
        service = CondoUnitService(db)
        unit = service.get_unit(unit_id)
        return CondoUnitResponse.model_validate(unit).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{unit_id}", summary="Partially update a condo unit")
def update_unit(unit_id: int, payload: CondoUnitUpdate, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = CondoUnitService(db)
        unit = service.update_unit(unit_id, payload, updated_by=updated_by)
        return CondoUnitResponse.model_validate(unit).model_dump(mode="json")
    finally:
        db.close()


@router.delete("/{unit_id}", summary="Soft delete a condo unit")
def delete_unit(unit_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = CondoUnitService(db)
        unit = service.delete_unit(unit_id, updated_by=updated_by)
        return {
            "message": "Condo unit deleted successfully.",
            "deleted_record": CondoUnitResponse.model_validate(unit).model_dump(mode="json"),
        }
    finally:
        db.close()
