"""Shared audit logging for the application.

Writes to the shared ``audit_log`` table (see the project DDL).  The table
carries generic columns (``table_name``, ``record_id``, ``action_type``,
``old_values``, ``new_values``, ``changed_fields``, ``acted_by``, ...) as well
as dedicated foreign-key columns for the main business entities
(``payable_id``, ``receivable_id``, ``invoice_id``, ``bank_statement_id``,
``bank_transaction_id``, ``document_extraction_id``, ...).
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

TABLE_NAME = "audit_log"

# Generic actions
ACTION_CREATE = "CREATE"
ACTION_UPDATE = "UPDATE"
ACTION_DELETE = "DELETE"
ACTION_SOFT_DELETE = "SOFT_DELETE"


class AuditLogger:

    def __init__(self, db):
        self.db = db

    def log(
        self,
        table_name: str,
        record_id: int,
        action: str,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        acted_by: Optional[int] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        *,
        document_extraction_id: Optional[int] = None,
        gmail_import_log_id: Optional[int] = None,
        invoice_id: Optional[int] = None,
        bank_statement_id: Optional[int] = None,
        bank_transaction_id: Optional[int] = None,
        receivable_id: Optional[int] = None,
        payable_id: Optional[int] = None,
        reconciliation_id: Optional[int] = None,
        special_assessment_id: Optional[int] = None,
        assessment_allocation_id: Optional[int] = None,
        vendor_id: Optional[int] = None,
        detail: Optional[str] = None,
    ) -> int:
        """Insert a single audit_log row.

        Returns the new ``log_id``.
        """
        old_json = json.dumps(old_values, default=str) if old_values is not None else None
        new_json = json.dumps(new_values, default=str) if new_values is not None else None

        changed_fields = self._compute_changed_fields(old_values, new_values)

        cursor = self.db.cursor()

        query = f"""
        INSERT INTO {TABLE_NAME}
        (
            table_name,
            record_id,
            action_type,
            old_values,
            new_values,
            changed_fields,
            acted_by,
            session_id,
            ip_address,
            document_extraction_id,
            gmail_import_log_id,
            invoice_id,
            bank_statement_id,
            bank_transaction_id,
            receivable_id,
            payable_id,
            reconciliation_id,
            special_assessment_id,
            assessment_allocation_id,
            vendor_id,
            detail
        )
        VALUES
        (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """

        cursor.execute(
            query,
            (
                table_name,
                record_id,
                action.upper(),
                old_json,
                new_json,
                changed_fields,
                acted_by,
                session_id,
                ip_address,
                document_extraction_id,
                gmail_import_log_id,
                invoice_id,
                bank_statement_id,
                bank_transaction_id,
                receivable_id,
                payable_id,
                reconciliation_id,
                special_assessment_id,
                assessment_allocation_id,
                vendor_id,
                detail,
            ),
        )

        self.db.commit()

        return cursor.lastrowid

    def get_audit_trail(
        self,
        table_name: str,
        record_id: int,
        limit: Optional[int] = None,
    ) -> list[dict]:
        """Return the audit trail for a single record, oldest first."""
        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT al.*, u.name AS acted_by_name
        FROM {TABLE_NAME} al
        LEFT JOIN users u ON al.acted_by = u.id
        WHERE al.table_name = %s AND al.record_id = %s
        ORDER BY al.acted_at ASC
        """
        params: list[Any] = [table_name, record_id]

        if limit:
            query += " LIMIT %s"
            params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        for row in rows:
            if row.get("old_values") and isinstance(row["old_values"], str):
                try:
                    row["old_values"] = json.loads(row["old_values"])
                except json.JSONDecodeError:
                    pass
            if row.get("new_values") and isinstance(row["new_values"], str):
                try:
                    row["new_values"] = json.loads(row["new_values"])
                except json.JSONDecodeError:
                    pass

        return rows

    def get_audit_trail_by_entity(
        self,
        entity_column: str,
        entity_id: int,
        limit: Optional[int] = None,
    ) -> list[dict]:
        """Return audit rows tied to a specific entity FK column.

        ``entity_column`` should be one of the audit_log FK columns, e.g.
        ``payable_id``, ``receivable_id``, ``invoice_id``,
        ``bank_statement_id``, ``bank_transaction_id``,
        ``document_extraction_id``.
        """
        allowed_columns = {
            "document_extraction_id",
            "gmail_import_log_id",
            "invoice_id",
            "bank_statement_id",
            "bank_transaction_id",
            "receivable_id",
            "payable_id",
            "reconciliation_id",
            "special_assessment_id",
            "assessment_allocation_id",
            "vendor_id",
        }
        if entity_column not in allowed_columns:
            raise ValueError(f"entity_column '{entity_column}' is not an allowed audit FK column")

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT al.*, u.name AS acted_by_name
        FROM {TABLE_NAME} al
        LEFT JOIN users u ON al.acted_by = u.id
        WHERE al.{entity_column} = %s
        ORDER BY al.acted_at ASC
        """
        params: list[Any] = [entity_id]

        if limit:
            query += " LIMIT %s"
            params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        for row in rows:
            if row.get("old_values") and isinstance(row["old_values"], str):
                try:
                    row["old_values"] = json.loads(row["old_values"])
                except json.JSONDecodeError:
                    pass
            if row.get("new_values") and isinstance(row["new_values"], str):
                try:
                    row["new_values"] = json.loads(row["new_values"])
                except json.JSONDecodeError:
                    pass

        return rows

    @staticmethod
    def _compute_changed_fields(
        old_values: Optional[dict],
        new_values: Optional[dict],
    ) -> Optional[str]:
        if not old_values or not new_values:
            return None

        changed = [
            key
            for key in new_values
            if old_values.get(key) != new_values.get(key)
        ]

        if not changed:
            return None

        return ",".join(str(field) for field in changed)[:500]