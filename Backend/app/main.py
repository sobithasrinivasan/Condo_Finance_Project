from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
from app.core.database import check_db_connection

from app.modules.extraction.router import router as extraction_router
from app.modules.user.router import router as user_router
from app.modules.invoice.router import router as invoice_router
from app.modules.statement.router import router as statement_router
from app.modules.health.router import router as health_router
from app.modules.email_invoice_ingestion.email_invoice_ingestion.src.api import (
    router as gmail_invoices_router,
)
from app.modules.reports.router import router as reports_router
from app.modules.condo_units.router import router as condo_units_router
from app.modules.condo_association.router import router as condo_association_router
from app.modules.special_assessments.router import router as special_assessments_router
from app.modules.bank_reconciliation.router import router as reconciliation_router
from app.modules.bank_transactions.router import router as bank_transactions_router
from app.modules.vendor.router import router as vendor_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.login.router import router as login_router
from app.modules.receivables.router import router as receivables_router
from app.modules.payables.router import router as payables_router
from app.modules.receivables.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)

logging.getLogger("google_genai").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Condo Finance Extraction API")

    try:
        check_db_connection()
        logger.info("Database connection successful.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")

    # Start receivables scheduler (checks/generates yearly receivables on startup)
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Receivables scheduler failed to start: {e}")

    yield

    # Shutdown scheduler gracefully
    try:
        stop_scheduler()
    except Exception:
        pass

    logger.info("Shutting down Condo Finance Extraction API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Condo Finance Extraction API",
        version="1.0.0",
        description="Document Extraction using Google Document AI and Gemini",
        lifespan=lifespan,
    )

    origins = settings.cors_origins_list

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_FOLDER), name="uploads")

    app.include_router(
        extraction_router,
        prefix="/api/v1",
    )

    app.include_router(
        user_router,
        prefix="/api/v1",
    )

    app.include_router(
        invoice_router,
        prefix="/api/v1",
    )

    app.include_router(
        statement_router,
        prefix="/api/v1",
    )

    app.include_router(
        health_router,
        prefix="/api/v1",
    )

    app.include_router(
        gmail_invoices_router,
        prefix="/api/v1",
    )

    app.include_router(
        vendor_router,
        prefix="/api/v1",
    )

    app.include_router(
        dashboard_router,
        prefix="/api/v1"
    )

    app.include_router(
        reports_router,
        prefix="/api/v1"
    )

    app.include_router(
        condo_units_router,
        prefix="/api/v1"
    )

    app.include_router(
        condo_association_router,
        prefix="/api/v1"
    )

    app.include_router(
        special_assessments_router,
        prefix="/api/v1"
    )

    app.include_router(
        bank_transactions_router,
        prefix="/api/v1"
    )

    app.include_router(
        reconciliation_router,
        prefix="/api/v1"
    )

    # Login Router
    app.include_router(
    login_router,
    prefix="/api/v1"
)

    # Receivables Router
    app.include_router(
        receivables_router,
        prefix="/api/v1"
    )

    # Payables Router
    app.include_router(
        payables_router,
        prefix="/api/v1"
    )

    @app.get("/")
    def root():
        return {
            "message": "Condo Finance Extraction API is running"
        }

    return app


app = create_app()