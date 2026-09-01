import math
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import BankTransactionFilters, BankTransactionResponse
from .service import BankTransactionService

router = APIRouter(prefix="/bank-transactions", tags=["Bank Transactions"])


@router.get("/summary", summary="Get transaction summary for a bank statement")
def get_transaction_summary(bank_statement_id: int):
    db = get_db_connection()
    try:
        service = BankTransactionService(db)
        return service.get_summary(bank_statement_id)
    finally:
        db.close()


@router.get("", summary="List bank transactions for a statement")
def list_transactions(
    bank_statement_id: Optional[int] = None,
    document_extraction_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    transaction_method: Optional[str] = None,
    description: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    transaction_date_from: Optional[date] = None,
    transaction_date_to: Optional[date] = None,
    reconciled: Optional[bool] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = BankTransactionService(db)
        rows, total = service.list_transactions(
            statement_id=bank_statement_id,
            document_extraction_id=document_extraction_id,
            transaction_type=transaction_type,
            transaction_method=transaction_method,
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
        data = [BankTransactionResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.get("/{transaction_id}", summary="Get a single bank transaction")
def get_transaction(transaction_id: int):
    db = get_db_connection()
    try:
        service = BankTransactionService(db)
        transaction = service.get_transaction(transaction_id)
        return BankTransactionResponse.model_validate(transaction).model_dump(mode="json")
    finally:
        db.close()