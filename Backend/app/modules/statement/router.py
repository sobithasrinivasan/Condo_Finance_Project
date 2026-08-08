import math
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import BankStatementFilters, BankStatementResponse
from .service import BankStatementService

router = APIRouter(prefix="/bank-statements", tags=["Bank Statements"])


@router.get("", summary="List bank statements with their transactions")
def list_statements(
    association_id: Optional[int] = None,
    document_extraction_id: Optional[int] = None,
    bank_account_id: Optional[int] = None,
    statement_name: Optional[str] = None,
    statement_period: Optional[date] = None,
    period_month: Optional[int] = Query(None, ge=1, le=12),
    uploaded_by: Optional[int] = None,
    status: Optional[str] = None,
    created_by: Optional[int] = None,
    updated_by: Optional[int] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    transaction_type: Optional[str] = None,
    description: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    transaction_date_from: Optional[date] = None,
    transaction_date_to: Optional[date] = None,
    reconciled: Optional[bool] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = BankStatementFilters(
        association_id=association_id,
        document_extraction_id=document_extraction_id,
        bank_account_id=bank_account_id,
        statement_name=statement_name,
        statement_period=statement_period,
        period_month=period_month,
        uploaded_by=uploaded_by,
        status=status,
        created_by=created_by,
        updated_by=updated_by,
        created_from=created_from,
        created_to=created_to,
        transaction_type=transaction_type,
        description=description,
        amount_min=amount_min,
        amount_max=amount_max,
        transaction_date_from=transaction_date_from,
        transaction_date_to=transaction_date_to,
        reconciled=reconciled,
        is_active=is_active,
        page=page,
        page_size=page_size,
    )

    db = get_db_connection()
    try:
        service = BankStatementService(db)
        rows, total = service.list_statements(filters)
        data = [BankStatementResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.get("/{statement_id}", summary="Get a single bank statement with its transactions")
def get_statement(statement_id: int):
    db = get_db_connection()
    try:
        service = BankStatementService(db)
        statement = service.get_statement(statement_id)
        return BankStatementResponse.model_validate(statement).model_dump(mode="json")
    finally:
        db.close()


@router.delete(
    "/{statement_id}",
    summary="Soft delete a bank statement",
    description="soft delete sets is_active=0",
)
def delete_statement(statement_id: int, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = BankStatementService(db)
        statement = service.delete_statement(statement_id, updated_by=updated_by)
        return {
            "message": "Bank statement deleted successfully.",
            "deleted_record": BankStatementResponse.model_validate(statement).model_dump(mode="json"),
        }
    finally:
        db.close()