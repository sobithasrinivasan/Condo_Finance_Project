from fastapi import APIRouter

from app.core.database import get_db_connection

from .schemas import DashboardSummary
from .service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary, summary="Get dashboard summary")
def get_dashboard_summary():
    db = get_db_connection()
    try:
        service = DashboardService(db)
        summary = service.get_summary()
        return DashboardSummary.model_validate(summary).model_dump(mode="json")
    finally:
        db.close()


@router.get("/activities", summary="Get recent dashboard activities")
def get_activities(limit: int = 10):
    db = get_db_connection()
    try:
        service = DashboardService(db)
        activities = service.repo.get_recent_activities(limit=limit)
        return {"activities": activities}
    finally:
        db.close()


@router.get("/recent-activities", summary="Get recent dashboard activities")
def get_recent_activities(limit: int = 10):
    db = get_db_connection()
    try:
        service = DashboardService(db)
        activities = service.repo.get_recent_activities(limit=limit)
        return {"activities": activities}
    finally:
        db.close()
