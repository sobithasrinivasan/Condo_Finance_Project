import io
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.database import get_db_connection

from .schema import ReportRequest, ReportPreview
from .service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/available", summary="List available reports")
def available_reports():
    db = get_db_connection()
    try:
        service = ReportService(db)
        return service.list_available()
    finally:
        db.close()


@router.get("/preview", response_model=ReportPreview, summary="Preview report for a period")
def preview_report(
    report_type: str = Query(..., description="e.g. monthly_summary"),
    period: str = Query(..., description="YYYY-MM"),
):
    db = get_db_connection()
    try:
        service = ReportService(db)
        preview = service.get_preview(report_type, period)
        return ReportPreview.model_validate(preview).model_dump(mode="json")
    finally:
        db.close()


@router.post("/generate/pdf", summary="Generate a PDF report")
def generate_pdf(payload: ReportRequest, user_id: int = Query(2, description="temp user ID")):
    db = get_db_connection()
    try:
        service = ReportService(db)
        pdf_bytes = service.generate_pdf(payload.report_type, payload.period, user_id)
    finally:
        db.close()

    filename = f"{payload.report_type.replace(' ', '_')}_{payload.period}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/generate/csv", summary="Generate a CSV report")
def generate_csv(payload: ReportRequest, user_id: int = Query(2, description="temp user ID")):
    db = get_db_connection()
    try:
        service = ReportService(db)
        csv_content = service.generate_csv(payload.report_type, payload.period, user_id)
    finally:
        db.close()

    filename = f"{payload.report_type.replace(' ', '_')}_{payload.period}.csv"
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}", summary="Delete a report")
def delete_report(
    report_id: int,
    updated_by: Optional[int] = Query(None, description="User ID performing delete"),
):
    db = get_db_connection()
    try:
        service = ReportService(db)
        success = service.delete_report(report_id, updated_by)
        return {"success": success, "message": "Report deleted successfully" if success else "Report not found"}
    finally:
        db.close()
