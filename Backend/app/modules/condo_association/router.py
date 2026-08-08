import math
from typing import Optional

from fastapi import APIRouter, Query, status

from app.core.database import get_db_connection

from .schema import (
    CondoAssociationCreate,
    CondoAssociationResponse,
    CondoAssociationUpdate,
)
from .service import CondoAssociationService

router = APIRouter(prefix="/condo-associations", tags=["Condo Associations"])


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new condo association")
def create_association(payload: CondoAssociationCreate, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = CondoAssociationService(db)
        association = service.create_association(payload, created_by=created_by)
        return CondoAssociationResponse.model_validate(association).model_dump(mode="json")
    finally:
        db.close()


@router.get("", summary="List condo associations")
def list_associations(
    name: Optional[str] = None,
    status_: Optional[str] = Query(None, alias="status"),
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = CondoAssociationService(db)
        rows, total = service.list_associations(
            name=name,
            status=status_,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        data = [
            CondoAssociationResponse.model_validate(r).model_dump(mode="json")
            for r in rows
        ]
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


@router.get("/{association_id}", summary="Get a single condo association")
def get_association(association_id: int):
    db = get_db_connection()
    try:
        service = CondoAssociationService(db)
        association = service.get_association(association_id)
        return CondoAssociationResponse.model_validate(association).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{association_id}", summary="Partially update a condo association")
def update_association(
    association_id: int, payload: CondoAssociationUpdate, updated_by: Optional[int] = None
):
    db = get_db_connection()
    try:
        service = CondoAssociationService(db)
        association = service.update_association(
            association_id, payload, updated_by=updated_by
        )
        return CondoAssociationResponse.model_validate(association).model_dump(mode="json")
    finally:
        db.close()


@router.delete("/{association_id}", summary="Soft delete a condo association")
def delete_association(association_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = CondoAssociationService(db)
        association = service.delete_association(
            association_id, updated_by=updated_by
        )
        return {
            "message": "Condo association deleted successfully.",
            "deleted_record": CondoAssociationResponse.model_validate(
                association
            ).model_dump(mode="json"),
        }
    finally:
        db.close()

