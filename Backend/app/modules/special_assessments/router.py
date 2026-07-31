import math
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import AssessmentUpdateRequest, CreateAssessmentRequest
from .service import AssessmentService

router = APIRouter(prefix="/special-assessments", tags=["Special Assessments"])


@router.post("", summary="Create a new special assessment for all units", status_code=201)
def create_assessment(payload: CreateAssessmentRequest, created_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        result = service.create_assessment(
            title=payload.title,
            description=payload.description,
            amount=payload.amount,
            due_date=payload.due_date,
            status=payload.status.value,
            created_by=created_by,
        )
        return result
    finally:
        db.close()


@router.get("/summary", summary="Get special assessment summary stats")
def get_assessment_summary():
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        return service.get_summary()
    finally:
        db.close()


@router.get("", summary="List special assessment records")
def list_assessments(
    unit_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        rows, total = service.list_assessments(
            unit_id=unit_id,
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


@router.get("/{assessment_id}", summary="Get a single special assessment record")
def get_assessment(assessment_id: int):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        return service.get_assessment(assessment_id)
    finally:
        db.close()


@router.patch("/{assessment_id}", summary="Update a special assessment record")
def update_assessment(assessment_id: int, payload: AssessmentUpdateRequest, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        data = payload.get_update_fields()
        return service.update_assessment(assessment_id, data, updated_by=updated_by)
    finally:
        db.close()
