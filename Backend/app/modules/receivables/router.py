import math
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import GenerateMonthlyRequest, GenerateYearlyRequest, ReceivableCreate, ReceivableFilters, ReceivableResponse, ReceivableUpdate
from .service import ReceivableService

router = APIRouter(prefix="/receivables", tags=["Receivables"])


@router.post("", summary="Create a new receivable")
def create_receivable(payload: ReceivableCreate, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        receivable = service.create_receivable(payload, created_by=created_by)
        return ReceivableResponse.model_validate(receivable).model_dump(mode="json")
    finally:
        db.close()


@router.get("", summary="List receivables")
def list_receivables(
    association_id: Optional[int] = None,
    document_extraction_id: Optional[int] = None,
    unit_id: Optional[int] = None,
    from_payer: Optional[str] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    deposit_month_from: Optional[date] = None,
    deposit_month_to: Optional[date] = None,
    instrument: Optional[str] = None,
    status: Optional[str] = None,
    bank: Optional[str] = None,
    created_by: Optional[int] = None,
    updated_by: Optional[int] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = ReceivableFilters(
        association_id=association_id,
        document_extraction_id=document_extraction_id,
        unit_id=unit_id,
        from_payer=from_payer,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        deposit_month_from=deposit_month_from,
        deposit_month_to=deposit_month_to,
        instrument=instrument,
        status=status,
        bank=bank,
        created_by=created_by,
        updated_by=updated_by,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    db = get_db_connection()
    try:
        service = ReceivableService(db)
        rows, total = service.list_receivables(filters)
        data = [ReceivableResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.post("/generate-monthly", summary="Generate monthly HOA receivables for all active units")
def generate_monthly_receivables(payload: GenerateMonthlyRequest, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        result = service.generate_monthly_receivables(
            association_id=payload.association_id,
            month=payload.month,
            created_by=created_by,
        )
        return result
    finally:
        db.close()


@router.post("/generate-yearly", summary="Generate yearly HOA receivables for all active units (12 months)")
def generate_yearly_receivables(payload: GenerateYearlyRequest, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        result = service.generate_yearly_receivables(
            association_id=payload.association_id,
            year=payload.year,
            created_by=created_by,
        )
        return result
    finally:
        db.close()


@router.get("/{receivable_id}", summary="Get a single receivable")
def get_receivable(receivable_id: int):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        receivable = service.get_receivable(receivable_id)
        return ReceivableResponse.model_validate(receivable).model_dump(mode="json")
    finally:
        db.close()


@router.patch(
    "/{receivable_id}",
    summary="Update a receivable",
    description="Update receivable details including payment information",
)
def update_receivable(receivable_id: int, payload: ReceivableUpdate, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        receivable = service.update_receivable(receivable_id, payload, updated_by=updated_by)
        return ReceivableResponse.model_validate(receivable).model_dump(mode="json")
    finally:
        db.close()


@router.delete("/{receivable_id}", summary="Soft delete a receivable")
def delete_receivable(receivable_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReceivableService(db)
        result = service.soft_delete_receivable(receivable_id, updated_by=updated_by)
        return {"success": result}
    finally:
        db.close()
