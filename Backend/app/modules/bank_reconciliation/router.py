import math
from typing import Optional

from fastapi import APIRouter, Query

from app.core.database import get_db_connection

from .schema import (
    BatchReconciliationRequest,
    ReconciliationRequest,
    ReconciliationResponse,
    ReconciliationUpdateRequest,
)
from .audit import AuditLogger
from .service import ReconciliationService

router = APIRouter(prefix="/bank-reconciliation", tags=["Bank Reconciliation"])


@router.get("/summary", summary="Get reconciliation summary stats")
def get_reconciliation_summary(bank_statement_id: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        summary = service.get_summary(bank_statement_id=bank_statement_id)
        return summary
    finally:
        db.close()


@router.post("/reconcile", summary="Reconcile a single bank transaction")
def reconcile_transaction(payload: ReconciliationRequest, matched_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        result = service.reconcile_transaction(
            bank_transaction_id=payload.bank_transaction_id,
            matched_by=matched_by,
        )
        return ReconciliationResponse.model_validate(result).model_dump(mode="json")
    finally:
        db.close()


@router.post("/reconcile-statement", summary="Reconcile all unreconciled transactions for one or more statements")
def reconcile_statement(payload: BatchReconciliationRequest, matched_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        all_results = []

        for statement_id in payload.bank_statement_ids:
            results = service.reconcile_statement(
                bank_statement_id=statement_id,
                matched_by=matched_by,
            )
            for r in results:
                if "error" in r:
                    all_results.append(r)
                else:
                    all_results.append(
                        ReconciliationResponse.model_validate(r).model_dump(mode="json")
                    )

        return {
            "message": f"Reconciliation completed. {len(all_results)} transaction(s) processed across {len(payload.bank_statement_ids)} statement(s).",
            "statements_processed": payload.bank_statement_ids,
            "results": all_results,
        }
    finally:
        db.close()


@router.get("", summary="List reconciliation records")
def list_reconciliations(
    bank_statement_id: Optional[int] = None,
    reconciliation_type: Optional[str] = None,
    status_: Optional[str] = Query(None, alias="status"),
    payment_status: Optional[str] = None,
    is_active: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        rows, total = service.list_reconciliations(
            bank_statement_id=bank_statement_id,
            reconciliation_type=reconciliation_type,
            status=status_,
            payment_status=payment_status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        data = [ReconciliationResponse.model_validate(r).model_dump(mode="json") for r in rows]
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


@router.get("/{record_id}", summary="Get a single reconciliation record")
def get_reconciliation(record_id: int):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        record = service.get_reconciliation(record_id)
        return ReconciliationResponse.model_validate(record).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{record_id}", summary="Manually resolve a reconciliation record")
def update_reconciliation(record_id: int, payload: ReconciliationUpdateRequest, updated_by: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        record = service.update_reconciliation(record_id, payload, updated_by=updated_by)
        return ReconciliationResponse.model_validate(record).model_dump(mode="json")
    finally:
        db.close()


@router.get("/{record_id}/audit", summary="Get audit trail for a reconciliation record")
def get_audit_trail(record_id: int):
    db = get_db_connection()
    try:
        audit = AuditLogger(db)
        trail = audit.get_audit_trail("reconciliation", record_id)
        return {"data": trail}
    finally:
        db.close()


@router.get("/transaction/{transaction_id}/audit", summary="Get full audit trail for a bank transaction")
def get_transaction_audit_trail(transaction_id: int):
    db = get_db_connection()
    try:
        audit = AuditLogger(db)
        trail = audit.get_audit_trail_by_transaction(transaction_id)
        return {"data": trail}
    finally:
        db.close()
