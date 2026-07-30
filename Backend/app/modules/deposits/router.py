import math
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import DepositUpdateRequest
from .service import DepositService

router = APIRouter(prefix="/deposits", tags=["HOA Deposits"])


@router.get("/summary", summary="Get HOA deposit summary stats")
def get_deposit_summary(
    deposit_month: Optional[int] = Query(None, ge=1, le=12),
    deposit_year: Optional[int] = None,
):
    db = get_db_connection()
    try:
        service = DepositService(db)
        return service.get_summary(
            deposit_month=deposit_month,
            deposit_year=deposit_year,
        )
    finally:
        db.close()


@router.get("", summary="List HOA deposit records")
def list_deposits(
    unit_id: Optional[int] = None,
    deposit_month: Optional[int] = Query(None, ge=1, le=12),
    deposit_year: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = DepositService(db)
        rows, total = service.list_deposits(
            unit_id=unit_id,
            deposit_month=deposit_month,
            deposit_year=deposit_year,
            status=status,
            page=page,
            page_size=page_size,
        )
        return {
            "data": rows,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }
    finally:
        db.close()


@router.get("/{deposit_id}", summary="Get a single deposit record")
def get_deposit(deposit_id: int):
    db = get_db_connection()
    try:
        service = DepositService(db)
        return service.get_deposit(deposit_id)
    finally:
        db.close()


@router.patch("/{deposit_id}", summary="Update a deposit record")
def update_deposit(deposit_id: int, payload: DepositUpdateRequest, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = DepositService(db)
        data = payload.get_update_fields()
        return service.update_deposit(deposit_id, data, updated_by=updated_by)
    finally:
        db.close()
