from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

from app.modules.vendor.router import router as vendor_router

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

    yield

    logger.info("Shutting down Condo Finance Extraction API")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Condo Finance Extraction API",
        version="1.0.0",
        description="Document Extraction using Google Document AI and Gemini",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    # Vendor Router
    app.include_router(
        vendor_router,
        prefix="/api/v1",
    )

    @app.get("/")
    def root():
        return {
            "message": "Condo Finance Extraction API is running"
        }

    return app


app = create_app()