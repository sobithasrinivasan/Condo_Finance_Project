import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

TABLE_NAME = "audit_logs"

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


class AuditLogger:

    def __init__(self, db):
        self.db = db

    def log(
        self,
        entity_type: str,
        entity_id: int,
        action: str,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        performed_by: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> int:
        cursor = self.db.cursor()

        query = f"""
        INSERT INTO {TABLE_NAME}
        (entity_type, entity_id, action, old_value, new_value, performed_by, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        cursor.execute(
            query,
            (
                entity_type,
                entity_id,
                action,
                json.dumps(old_value) if old_value else None,
                json.dumps(new_value) if new_value else None,
                performed_by,
                notes,
            ),
        )

        self.db.commit()

        return cursor.lastrowid

    def get_audit_trail(
        self,
        entity_type: str,
        entity_id: int,
    ) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT al.*, u.name as performed_by_name
            FROM {TABLE_NAME} al
            LEFT JOIN users u ON al.performed_by = u.id
            WHERE al.entity_type = %s AND al.entity_id = %s
            ORDER BY al.performed_at ASC
            """,
            (entity_type, entity_id),
        )

        return cursor.fetchall()

    def get_audit_trail_by_transaction(self, bank_transaction_id: int) -> list[dict]:
        cursor = self.db.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT al.*, u.name as performed_by_name
            FROM {TABLE_NAME} al
            LEFT JOIN users u ON al.performed_by = u.id
            WHERE (al.entity_type = 'reconciliation' AND al.entity_id IN (
                SELECT id FROM reconciliation_records WHERE bank_transaction_id = %s
            ))
            OR (al.entity_type = 'bank_transaction' AND al.entity_id = %s)
            OR (al.entity_type = 'invoice' AND al.entity_id IN (
                SELECT reference_id FROM reconciliation_records
                WHERE bank_transaction_id = %s AND reconciliation_type = 'Invoice'
            ))
            ORDER BY al.performed_at ASC
            """,
            (bank_transaction_id, bank_transaction_id, bank_transaction_id),
        )

        return cursor.fetchall()
