import math
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import InvoiceFilters, InvoiceResponse, InvoiceUpdate
from .service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("", summary="List invoices")
def list_invoices(
    association_id: Optional[int] = None,
    invoice_number: Optional[str] = None,
    vendor_id: Optional[int] = None,
    document_extraction_id: Optional[int] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    gmail_import_id: Optional[int] = None,
    created_by: Optional[int] = None,
    updated_by: Optional[int] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    invoice_date_from: Optional[date] = None,
    invoice_date_to: Optional[date] = None,
    due_date_from: Optional[date] = None,
    due_date_to: Optional[date] = None,
    created_from: Optional[date] = None,
    created_to: Optional[date] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = InvoiceFilters(
        association_id=association_id,
        invoice_number=invoice_number,
        vendor_id=vendor_id,
        document_extraction_id=document_extraction_id,
        status=status,
        source=source,
        gmail_import_id=gmail_import_id,
        created_by=created_by,
        updated_by=updated_by,
        amount_min=amount_min,
        amount_max=amount_max,
        invoice_date_from=invoice_date_from,
        invoice_date_to=invoice_date_to,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        created_from=created_from,
        created_to=created_to,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    db = get_db_connection()
    try:
        service = InvoiceService(db)
        rows, total = service.list_invoices(filters)
        data = [InvoiceResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.get("/{invoice_id}", summary="Get a single invoice")
def get_invoice(invoice_id: int):
    db = get_db_connection()
    try:
        service = InvoiceService(db)
        invoice = service.get_invoice(invoice_id)
        return InvoiceResponse.model_validate(invoice).model_dump(mode="json")
    finally:
        db.close()


@router.patch(
    "/{invoice_id}",
    summary="Edit an invoice / approve or reject it",
    description=(
        "update invoice"
    ),
)
def update_invoice(invoice_id: int, payload: InvoiceUpdate, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = InvoiceService(db)
        invoice = service.update_invoice(invoice_id, payload, updated_by=updated_by)
        return InvoiceResponse.model_validate(invoice).model_dump(mode="json")
    finally:
        db.close()
