import math
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import PayableCreate, PayableFilters, PayableResponse, PayableUpdate
from .service import PayableService

router = APIRouter(prefix="/payables", tags=["Payables"])


@router.post("", summary="Create a payable")
def create_payable(payload: PayableCreate, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = PayableService(db)
        payable = service.create_payable(payload, created_by=created_by)
        return PayableResponse.model_validate(payable).model_dump(mode="json")
    finally:
        db.close()


@router.get("", summary="List payables")
def list_payables(
    association_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    document_extraction_id: Optional[int] = None,
    pay_to: Optional[str] = None,
    status: Optional[str] = None,
    instrument: Optional[str] = None,
    created_by: Optional[int] = None,
    updated_by: Optional[int] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    date_of_payment_from: Optional[date] = None,
    date_of_payment_to: Optional[date] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    created_from: Optional[date] = None,
    created_to: Optional[date] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = PayableFilters(
        association_id=association_id,
        vendor_id=vendor_id,
        document_extraction_id=document_extraction_id,
        pay_to=pay_to,
        status=status,
        instrument=instrument,
        created_by=created_by,
        updated_by=updated_by,
        amount_min=amount_min,
        amount_max=amount_max,
        date_of_payment_from=date_of_payment_from,
        date_of_payment_to=date_of_payment_to,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        created_from=created_from,
        created_to=created_to,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    db = get_db_connection()
    try:
        service = PayableService(db)
        rows, total = service.list_payables(filters)
        data = [PayableResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.get("/{payable_id}", summary="Get a single payable")
def get_payable(payable_id: int):
    db = get_db_connection()
    try:
        service = PayableService(db)
        payable = service.get_payable(payable_id)
        return PayableResponse.model_validate(payable).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{payable_id}", summary="Update a payable")
def update_payable(payable_id: int, payload: PayableUpdate, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = PayableService(db)
        payable = service.update_payable(payable_id, payload, updated_by=updated_by)
        return PayableResponse.model_validate(payable).model_dump(mode="json")
    finally:
        db.close()


@router.delete("/{payable_id}", summary="Soft delete a payable")
def soft_delete_payable(payable_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = PayableService(db)
        return service.soft_delete_payable(payable_id, updated_by=updated_by)
    finally:
        db.close()