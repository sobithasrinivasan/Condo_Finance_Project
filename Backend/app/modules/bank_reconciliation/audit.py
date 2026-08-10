import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

TABLE_NAME = "audit_log"

# Audit Actions
ACTION_RECONCILIATION_STARTED = "RECONCILIATION_STARTED"
ACTION_ANALYSIS_COMPLETED = "ANALYSIS_COMPLETED"
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

        # Build dynamic columns for the specific FK
        fk_column = ENTITY_TYPE_TO_FK_COLUMN.get(entity_type)

        # Determine changed_fields from old_value/new_value diff
        changed_fields = None
        if old_value and new_value:
            changed = [k for k in new_value if old_value.get(k) != new_value.get(k)]
            changed_fields = ",".join(changed) if changed else None

        if fk_column:
            query = f"""
            INSERT INTO {TABLE_NAME}
            (table_name, record_id, action_type, old_values, new_values, changed_fields, acted_by, detail, {fk_column})
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                query,
                (
                    entity_type,
                    entity_id,
                    action,
                    json.dumps(old_value) if old_value else None,
                    json.dumps(new_value) if new_value else None,
                    changed_fields,
                    performed_by,
                    notes,
                    entity_id,
                ),
            )
        else:
            query = f"""
            INSERT INTO {TABLE_NAME}
            (table_name, record_id, action_type, old_values, new_values, changed_fields, acted_by, detail)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                query,
                (
                    entity_type,
                    entity_id,
                    action,
                    json.dumps(old_value) if old_value else None,
                    json.dumps(new_value) if new_value else None,
                    changed_fields,
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

        # Use the specific FK column if available for better indexed lookup
        fk_column = ENTITY_TYPE_TO_FK_COLUMN.get(entity_type)

        if fk_column:
            cursor.execute(
                f"""
                SELECT al.*, u.name as performed_by_name
                FROM {TABLE_NAME} al
                LEFT JOIN users u ON al.acted_by = u.id
                WHERE al.{fk_column} = %s
                ORDER BY al.acted_at ASC
                """,
                (entity_id,),
            )
        else:
            cursor.execute(
                f"""
                SELECT al.*, u.name as performed_by_name
                FROM {TABLE_NAME} al
                LEFT JOIN users u ON al.acted_by = u.id
                WHERE al.table_name = %s AND al.record_id = %s
                ORDER BY al.acted_at ASC
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
            LEFT JOIN users u ON al.acted_by = u.id
            WHERE al.bank_transaction_id = %s
               OR al.reconciliation_id IN (
                   SELECT id FROM reconciliations WHERE bank_transaction_id = %s
               )
               OR al.invoice_id IN (
                   SELECT record_id FROM reconciliations
                   WHERE bank_transaction_id = %s AND record_type = 'Invoice'
               )
            ORDER BY al.acted_at ASC
            """,
            (bank_transaction_id, bank_transaction_id, bank_transaction_id),
        )

        return cursor.fetchall()
