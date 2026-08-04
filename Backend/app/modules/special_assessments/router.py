import math
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

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
        summary = service.get_summary()
        # Serialize Decimal values
        return {k: (float(v) if isinstance(v, Decimal) else v) for k, v in summary.items()}
    finally:
        db.close()


@router.get("/grouped", summary="List assessments grouped by project (for main UI table)")
def list_grouped_assessments(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Returns assessments grouped by title — one row per assessment project.
    Each row shows: title, description, amount, due_date, total_units, paid_units, assessment_status.
    Use GET /special-assessments for per-unit drill-down.
    """
    db = get_db_connection()
    try:
        service = AssessmentService(db)
        rows, total = service.list_grouped(
            status=status,
            page=page,
            page_size=page_size,
        )
        # Serialize date/decimal fields
        serialized = []
        for row in rows:
            s = {}
            for k, v in row.items():
                if isinstance(v, (date, datetime)):
                    s[k] = v.isoformat()
                elif isinstance(v, Decimal):
                    s[k] = float(v)
                else:
                    s[k] = v
            serialized.append(s)

        return {
            "data": serialized,
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