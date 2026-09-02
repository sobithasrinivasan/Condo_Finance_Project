import logging
from typing import Optional

from app.core.audit import AuditLogger as CoreAuditLogger

logger = logging.getLogger(__name__)

TABLE_NAME = "reconciliation_audits"

# Audit Actions
ACTION_RECONCILIATION_STARTED = "RECONCILIATION_STARTED"
ACTION_GEMINI_ANALYSIS_COMPLETED = "GEMINI_ANALYSIS_COMPLETED"
ACTION_RECORD_MATCHED = "RECORD_MATCHED"
ACTION_RECORD_NEEDS_REVIEW = "RECORD_NEEDS_REVIEW"
ACTION_RECORD_UNRESOLVED = "RECORD_UNRESOLVED"
ACTION_INVOICE_STATUS_UPDATED = "INVOICE_STATUS_UPDATED"
ACTION_TRANSACTION_RECONCILED = "TRANSACTION_RECONCILED"
ACTION_MANUAL_RESOLUTION = "MANUAL_RESOLUTION"
ACTION_STATUS_CHANGED = "STATUS_CHANGED"
ACTION_DEPOSIT_MATCHED = "DEPOSIT_MATCHED"
ACTION_ASSESSMENT_MATCHED = "ASSESSMENT_MATCHED"

# Maps entity_type to the specific FK column in audit_log
ENTITY_TYPE_TO_FK_COLUMN = {
    "bank_transaction": "bank_transaction_id",
    "reconciliation": "reconciliation_id",
    "invoice": "invoice_id",
    "payable": "payable_id",
    "receivable": "receivable_id",
    "special_assessment": "special_assessment_id",
    "assessment_allocation": "assessment_allocation_id",
    "vendor": "vendor_id",
    "bank_statement": "bank_statement_id",
    "document_extraction": "document_extraction_id",
}


class AuditLogger:

    def __init__(self, db):
        self.db = db
        self.core_audit = CoreAuditLogger(db)

    def log(
        self,
        entity_type: str = None,
        entity_id: int = None,
        action: str = "",
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        performed_by: Optional[int] = None,
        notes: Optional[str] = None,
        *,
        bank_transaction_id: Optional[int] = None,
    ) -> int:
        """Log an audit entry to both reconciliation_audits and audit_log."""

        txn_id = bank_transaction_id or entity_id

        # ── Write to reconciliation_audits ─────────────────────────────
        cursor = self.db.cursor()
        cursor.execute(
            f"""
            INSERT INTO {TABLE_NAME}
            (bank_transaction_id, action, description, performed_by)
            VALUES (%s, %s, %s, %s)
            """,
            (txn_id, action, notes, performed_by),
        )
        self.db.commit()
        recon_audit_id = cursor.lastrowid

        # ── Write to audit_log (core) ─────────────────────────────────
        fk_column = ENTITY_TYPE_TO_FK_COLUMN.get(entity_type)
        fk_kwargs = {}
        if fk_column and entity_id:
            fk_kwargs[fk_column] = entity_id
        if bank_transaction_id:
            fk_kwargs["bank_transaction_id"] = bank_transaction_id

        self.core_audit.log(
            table_name=entity_type or "reconciliation",
            record_id=entity_id or txn_id,
            action=action,
            old_values=old_value,
            new_values=new_value,
            acted_by=performed_by,
            detail=notes,
            **fk_kwargs,
        )

        return recon_audit_id

    def get_audit_trail(
        self,
        entity_type: str = None,
        entity_id: int = None,
        *,
        bank_transaction_id: Optional[int] = None,
    ) -> list[dict]:
        """Get audit trail from reconciliation_audits for a bank transaction."""
        cursor = self.db.cursor(dictionary=True)
        txn_id = bank_transaction_id
        # If called with a reconciliation id, resolve to bank_transaction_id
        if not txn_id and entity_type == "reconciliation" and entity_id:
            cursor.execute(
                "SELECT bank_transaction_id FROM reconciliations WHERE id = %s",
                (entity_id,),
            )
            rec = cursor.fetchone()
            txn_id = rec["bank_transaction_id"] if rec else None
        if not txn_id:
            txn_id = entity_id
        cursor.execute(
            f"""
            SELECT ra.*, u.full_name as performed_by_name
            FROM {TABLE_NAME} ra
            LEFT JOIN users u ON ra.performed_by = u.id
            WHERE ra.bank_transaction_id = %s
            ORDER BY ra.performed_at ASC
            """,
            (txn_id,),
        )
        return cursor.fetchall()

    def get_audit_trail_by_transaction(self, bank_transaction_id: int) -> list[dict]:
        """Get all audit entries for a bank transaction."""
        return self.get_audit_trail(bank_transaction_id=bank_transaction_id)
