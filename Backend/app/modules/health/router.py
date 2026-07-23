"""Health check router — reports API liveness and database connectivity."""

from datetime import datetime, timezone

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.database import check_db_connection

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Health check")
def health_check():
    payload = {
        "status": "healthy",
        "database": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        check_db_connection()
    except Exception as exc:
        payload["status"] = "unhealthy"
        payload["database"] = "disconnected"
        payload["error"] = str(exc)
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)

    return JSONResponse(status_code=status.HTTP_200_OK, content=payload)
