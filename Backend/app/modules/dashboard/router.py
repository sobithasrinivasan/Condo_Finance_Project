from fastapi import APIRouter

from app.core.database import get_db_connection

from .schema import DashboardSummary, ActivitiesResponse
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


@router.get("/activities", response_model=ActivitiesResponse, summary="Get recent audit log activities")
def get_dashboard_activities():
    db = get_db_connection()
    try:
        service = DashboardService(db)
        activities = service.get_activities()
        return {"activities": activities}
    finally:
        db.close()
