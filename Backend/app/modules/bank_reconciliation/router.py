import math
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.database import get_db_connection
from .schema import (
    BatchReconciliationRequest,
    ExportRequest,
    ReconciliationRequest,
    ReconciliationResponse,
    ReconciliationUpdateRequest,
)
from .audit import AuditLogger
from .export import ExportService
from .service import ReconciliationService
from app.modules.bank_transactions.repository import BankTransactionRepository
from .repository import ReconciliationRepository

router = APIRouter(prefix="/bank-reconciliation", tags=["Bank Reconciliation"])


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


@router.post("/export", summary="Export reconciliation report as PDF, Excel, or CSV")
def export_reconciliation(payload: ExportRequest):
    db = get_db_connection()
    try:
        export_service = ExportService(db)
        
        # Separate audit section from data sections
        include_audit = "auditHistory" in payload.sections or payload.include_audit
        sections = [s for s in payload.sections if s != "auditHistory"]
        statement_ids = payload.get_statement_ids()
        
        if payload.format == "csv":
            content = export_service.export_csv(
                sections=sections,
                bank_statement_ids=statement_ids,
                include_audit=include_audit,
            )
            return StreamingResponse(
                iter([content]),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=reconciliation_report.csv"},
            )
        
        elif payload.format == "excel":
            content = export_service.export_excel(
                sections=sections,
                bank_statement_ids=statement_ids,
                include_audit=include_audit,
            )
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=reconciliation_report.xlsx"},
            )
        
        elif payload.format == "pdf":
            content = export_service.export_pdf(
                sections=sections,
                bank_statement_ids=statement_ids,
                include_audit=include_audit,
            )
            return StreamingResponse(
                iter([content]),
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=reconciliation_report.pdf"},
            )
        
        return {"error": "Unsupported format"}
    finally:
        db.close()


@router.get("/summary", summary="Get reconciliation summary stats")
def get_reconciliation_summary(bank_statement_id: Optional[int] = None):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        return service.get_summary(bank_statement_id=bank_statement_id)
    finally:
        db.close()


def _serialize_value(value):
    """Convert non-JSON-serializable types to JSON-compatible formats."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore')
    return value


def _serialize_dict(data: dict) -> dict:
    """Recursively serialize all values in a dictionary."""
    if not data:
        return data
    return {k: _serialize_value(v) for k, v in data.items()}


@router.get("/all-transactions", summary="Get all transactions with detailed reconciliation data")
def get_all_transactions_and_reconciliations(
    bank_statement_id:  Optional[int] = Query(None, description="Filter by bank statement ID. If not provided, returns all transactions."),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """
    **UNIFIED ENDPOINT - Returns transactions with ALL their reconciliations**
    
    Each transaction can have multiple reconciliation records (array format).
    
    Response format:
    {
      "data": [
        {
          "transaction": { /* all transaction fields */ },
          "reconciliations": [
            {"id": 2, "reconciliation_type": "Invoice", ...},
            {"id": 3, "reconciliation_type": "Deposit", ...}
          ]
        }
      ],
      "pagination": { ... }
    }
    
    Parameters:
    - bank_statement_id: Optional. Filter by statement. If omitted, returns ALL transactions.
    - page: Page number (default: 1)
    - page_size: Results per page (default: 50, max: 100)
    """
    db = get_db_connection()
    try:
        tx_repo = BankTransactionRepository(db)
        rec_repo = ReconciliationRepository(db)

        transactions, total = tx_repo.get_by_statement_id(
            statement_id=bank_statement_id,
            page=page,
            page_size=page_size,
        )
        
        rows = []
        for tx in transactions:
            # Get ALL reconciliations for this transaction (supports multiple reconciliations)
            reconciliations = rec_repo.get_all_by_transaction_id(tx.get("id"))
            serialized_reconciliations = [_serialize_dict(r) for r in reconciliations] if reconciliations else []
            
            rows.append({
                "transaction": _serialize_dict(tx),
                "reconciliations": serialized_reconciliations,  # Changed to array
            })
        
        return JSONResponse(
            content={
                "data": rows,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": math.ceil(total / page_size) if total else 0,
                },
            }
        )
    finally:
        db.close()


@router.get("", summary="List reconciliation records with filters")
def list_reconciliations(
    bank_statement_id: Optional[int] = None,
    reconciliation_type: Optional[str] = None,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    is_active: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        rows, total = service.list_reconciliations(
            bank_statement_id=bank_statement_id,
            reconciliation_type=reconciliation_type,
            status=status,
            payment_status=payment_status,
            is_active=is_active,
            page=page,
            page_size=page_size,
        )
        
        # Serialize to JSON-compatible format
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


@router.get("/{reconciliation_id}", summary="Get a single reconciliation record")
def get_reconciliation(reconciliation_id: int):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        record = service.get_reconciliation(reconciliation_id)
        return ReconciliationResponse.model_validate(record).model_dump(mode="json")
    finally:
        db.close()


@router.patch("/{reconciliation_id}", summary="Update a reconciliation record (manual resolution)")
def update_reconciliation(
    reconciliation_id: int,
    payload: ReconciliationUpdateRequest,
    updated_by: Optional[int] = None
):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        result = service.update_reconciliation(
            record_id=reconciliation_id,
            payload=payload,
            updated_by=updated_by,
        )
        return ReconciliationResponse.model_validate(result).model_dump(mode="json")
    finally:
        db.close()


@router.get("/{reconciliation_id}/audit", summary="Get audit trail for a reconciliation record")
def get_audit_trail(reconciliation_id: int):
    db = get_db_connection()
    try:
        audit_logger = AuditLogger(db)
        trail = audit_logger.get_audit_trail("reconciliation", reconciliation_id)
        return {"audit_trail": trail}
    finally:
        db.close()


@router.get("/matchable-records/{bank_transaction_id}", summary="Get all matchable records for a bank transaction")
def get_matchable_records(bank_transaction_id: int):
    db = get_db_connection()
    try:
        service = ReconciliationService(db)
        return service.get_matchable_records(bank_transaction_id)
    finally:
        db.close()