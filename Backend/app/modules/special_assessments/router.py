import math
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.core.database import get_db_connection

from .schema import (
    AllocationUpdateRequest,
    AssessmentUpdateRequest,
    CreateAllocationRequest,
    CreateAssessmentRequest,
)
from .service import AssessmentService

router = APIRouter(prefix="/special-assessments", tags=["Special Assessments"])


def _serialize(row: dict) -> dict:
    """Convert non-JSON-serializable types."""
    result = {}
    for k, v in row.items():
        if isinstance(v, (date, datetime)):
            result[k] = v.isoformat()
        elif isinstance(v, Decimal):
            result[k] = float(v)
        else:
            result[k] = v
    return result


@router.post("", summary="Create a new special assessment with allocations", status_code=201)
def create_assessment(payload: CreateAssessmentRequest, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)

        # Build allocations list if provided
        allocations = None
        if payload.allocations:
            allocations = [{"unit_id": a.unit_id, "allocated_amount": a.allocated_amount} for a in payload.allocations]

        result = service.create_assessment(
            association_id=payload.association_id,
            title=payload.title,
            description=payload.description,
            total_amount=payload.total_amount,
            due_date=payload.due_date,
            status=payload.status.value,
            allocations=allocations,
            created_by=created_by,
        )
        return {
            "assessment": _serialize(result["assessment"]),
            "allocations": [_serialize(a) for a in result["allocations"]],
        }
    finally:
        db.close()


@router.get("/summary", summary="Get special assessment summary stats")
def get_assessment_summary(association_id: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        summary = service.get_summary(association_id=association_id)
        return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in summary.items()}
    finally:
        db.close()


@router.get("", summary="List all special assessments")
def list_assessments(
    association_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        rows, total = service.list_assessments(
            association_id=association_id,
            status=status,
            page=page,
            page_size=page_size,
        )
        return {
            "data": [_serialize(r) for r in rows],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": math.ceil(total / page_size) if total else 0,
            },
        }
    finally:
        db.close()


@router.get("/allocations", summary="Get all assessment allocations")
def get_all_allocations(association_id: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        allocations = service.get_all_allocations(association_id=association_id)
        return {"data": [_serialize(a) for a in allocations]}
    finally:
        db.close()


@router.get("/{assessment_id}", summary="Get a single special assessment with summary")
def get_assessment(assessment_id: int):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        result = service.get_assessment(assessment_id)
        return _serialize(result)
    finally:
        db.close()


@router.get("/{assessment_id}/allocations", summary="Get all allocations for an assessment")
def get_allocations(assessment_id: int):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        allocations = service.get_allocations(assessment_id)
        return {"data": [_serialize(a) for a in allocations]}
    finally:
        db.close()


@router.post("/{assessment_id}/allocations", summary="Create an allocation for an existing assessment", status_code=201)
def create_allocation(assessment_id: int, payload: CreateAllocationRequest, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        result = service.create_allocation(
            assessment_id=assessment_id,
            unit_id=payload.unit_id,
            allocated_amount=payload.allocated_amount,
            created_by=created_by,
        )
        return _serialize(result)
    finally:
        db.close()


@router.patch("/{assessment_id}", summary="Update a special assessment")
def update_assessment(assessment_id: int, payload: AssessmentUpdateRequest, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        data = payload.get_update_fields()
        result = service.update_assessment(assessment_id, data, updated_by=updated_by)
        return _serialize(result)
    finally:
        db.close()


@router.patch("/allocations/{allocation_id}", summary="Update an assessment allocation")
def update_allocation(allocation_id: int, payload: AllocationUpdateRequest, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        data = payload.get_update_fields()
        result = service.update_allocation(allocation_id, data, updated_by=updated_by)
        return _serialize(result)
    finally:
        db.close()
