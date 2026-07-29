import math
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

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
    bank_statement_id: int,
    type: Optional[str] = Query(None, alias="type"),
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
            type_filter=type,
            reconciled=reconciled,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        return {
            "data": rows,
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
        return service.get_transaction(transaction_id)
    finally:
        db.close()
