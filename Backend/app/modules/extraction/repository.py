import json
import logging
import os
from typing import Optional
from urllib.parse import quote

logger = logging.getLogger(__name__)

from app.core.audit import ACTION_CREATE, ACTION_DELETE, ACTION_UPDATE, AuditLogger
from app.core.settings import settings


class ExtractionRepository:

    TABLE_NAME = "document_extraction"
    SYSTEM_USER_NAME = "System"
    SYSTEM_USER_EMAIL = "system@condo.local"

    @staticmethod
    def normalize_storage_path(file_path: Optional[str]) -> Optional[str]:
        if file_path is None:
            return None

        value = str(file_path).strip()
        if not value:
            return None

        normalized = value.replace("\\", "/")

        if normalized.startswith(("http://", "https://")):
            return normalized

        if normalized.startswith("./"):
            normalized = normalized[2:]

        if normalized.startswith("uploads/"):
            return normalized

        if normalized.startswith("/"):
            return normalized.lstrip("/")

        if "/" in normalized:
            return normalized

        return normalized

    def __init__(self, db):
        self.db = db
        self.audit = AuditLogger(db)

    def _get_or_create_system_user_id(self) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email IN (%s, %s) OR full_name IN (%s, %s)
            ORDER BY id
            LIMIT 1
            """,
            (
                self.SYSTEM_USER_EMAIL,
                "system@condofinance.local",
                self.SYSTEM_USER_NAME,
                "System User",
            ),
        )
        existing = cursor.fetchone()
        if existing:
            return existing["id"]

        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role, status, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (self.SYSTEM_USER_NAME, self.SYSTEM_USER_EMAIL, "hash", "Admin", "Active", None),
        )
        self.db.commit()
        logger.info("Created shared System user id=%s for extraction flows.", cursor.lastrowid)
        return cursor.lastrowid

    def _resolve_user_id(self, uploaded_by) -> int:
        """Temporarily attribute extractor-generated records to the shared
        System user so the flow stays stable while we debug uploader handling.
        """
        return self._get_or_create_system_user_id()

    def create_document(
        self,
        file_id: str,
        file_name: str,
        file_path: str,
        document_type: str,
        source: str,
        status: str,
        vendor_id: int = None,
        vendor_name: str = None,
        uploaded_by: int | str = None,
        original_file_name: str = None
    ) -> int:

        stored_original_name = original_file_name or file_name

        cursor = self.db.cursor()

        # fk_doc_vendor -> vendors(id): guard against a stale/nonexistent vendor_id
        # (e.g. after the vendors table was reworked) so the INSERT cannot fail with
        # MySQL error 1452. Fall back to resolving the vendor by name.
        if vendor_id is not None:
            vendor_check = self.db.cursor(dictionary=True)
            vendor_check.execute("SELECT id FROM vendors WHERE id = %s", (vendor_id,))
            if not vendor_check.fetchone():
                logger.warning(
                    "vendor_id=%s no longer exists in vendors; resolving by vendor_name instead.",
                    vendor_id,
                )
                vendor_id = None

        # Look the vendor up by name but NEVER create one here - an unregistered
        # vendor is rejected up-front with VENDOR_NOT_IN_LIST before upload, not
        # silently invented. vendor_name is still stored on the row as-is.
        if vendor_id is None and vendor_name:
            match = self.find_vendor_by_name(vendor_name)
            vendor_id = match["id"] if match else None

        resolved_user_id = self._resolve_user_id(uploaded_by)

        query = f"""
        INSERT INTO {self.TABLE_NAME}
        (
            document_id,
            document_name,
            document_type,
            source,
            original_file_name,
            file_path,
            status,
            vendor_id,
            vendor_name,
            uploaded_by,
            created_by,
            updated_by
        )
        VALUES
        (
            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
        )
        """

        normalized_file_path = self.normalize_storage_path(file_path)

        cursor.execute(
            query,
            (
                file_id,
                file_name,
                document_type,
                source,
                stored_original_name,
                normalized_file_path,
                status,
                vendor_id,
                vendor_name,
                resolved_user_id,
                resolved_user_id,
                resolved_user_id
            )
        )

        self.db.commit()

        return cursor.lastrowid


    def get_document(
        self,
        document_id: int
    ) -> Optional[dict]:

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT *
        FROM {self.TABLE_NAME}
        WHERE id=%s AND is_active = 1
        """

        cursor.execute(query, (document_id,))

        return cursor.fetchone()

    def get_documents(self):

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT *
        FROM {self.TABLE_NAME}
        ORDER BY created_at DESC
        """

        cursor.execute(query)

        return cursor.fetchall()

    def save_result(
        self,
        document_id: int,
        extracted_json: dict,
        ocr_text: str
    ):

        cursor = self.db.cursor()

        query = f"""
        UPDATE {self.TABLE_NAME}
        SET
            extracted_json=%s,
            ocr_text=%s
        WHERE id=%s
        """

        cursor.execute(
            query,
            (
                json.dumps(extracted_json, ensure_ascii=False),
                ocr_text,
                document_id
            )
        )

        self.db.commit()

    def update_status(
        self,
        document_id: int,
        status: str,
        error_message: str = None
    ):

        cursor = self.db.cursor()

        query = f"""
        UPDATE {self.TABLE_NAME}
        SET
            status=%s,
            error_message=%s
        WHERE id=%s
        """

        cursor.execute(
            query,
            (
                status,
                error_message,
                document_id
            )
        )

        self.db.commit()

    def get_status(
        self,
        document_id: int
    ) -> Optional[dict]:

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT
            id,
            status,
            error_message,
            updated_at
        FROM {self.TABLE_NAME}
        WHERE id=%s
        """

        cursor.execute(query, (document_id,))

        return cursor.fetchone()

    @staticmethod
    def normalize_document_url(file_path: Optional[str]) -> Optional[str]:
        if file_path is None:
            return None

        value = str(file_path).strip()
        if not value:
            return None

        if value.startswith(("http://", "https://")):
            return value

        normalized = value.replace("\\", "/")

        upload_root = os.path.abspath(settings.UPLOAD_FOLDER)
        candidate = os.path.abspath(value)

        try:
            if os.path.commonpath([upload_root, candidate]) == upload_root:
                relative_path = os.path.relpath(candidate, upload_root)
                normalized_path = relative_path.replace("\\", "/")
                return "/uploads/" + normalized_path.lstrip("/")
        except ValueError:
            pass

        if os.path.isabs(value):
            safe_value = value.replace("\\", "/")
            encoded_path = quote(safe_value, safe="")
            return f"/api/v1/extraction/open-file?path={encoded_path}"

        candidate = os.path.abspath(normalized)

        if normalized.startswith("uploads/"):
            return "/" + normalized.lstrip("/")

        if normalized.startswith("/"):
            return normalized

        return "/" + normalized.lstrip("/")

    def get_result(
        self,
        document_id: int
    ) -> Optional[dict]:

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT
            d.id,
            d.document_type,
            d.status,
            d.error_message,
            d.extracted_json,
            d.ocr_text,
            d.file_path,
            d.created_at,
            d.updated_at
        FROM {self.TABLE_NAME} d
        WHERE d.id=%s
        """

        cursor.execute(query, (document_id,))
        result = cursor.fetchone()

        if not result:
            return None

        if result.get("extracted_json") and isinstance(result["extracted_json"], str):
            result["extracted_json"] = json.loads(result["extracted_json"])

        file_path = result.get("file_path")
        normalized_file_path = file_path.replace('\\', '/') if file_path else None

        invoice_doc = None
        statement_doc = None

        if normalized_file_path:
            cursor2 = self.db.cursor(dictionary=True)
            cursor2.execute(
                "SELECT attachment_path FROM invoices WHERE is_active = 1 AND REPLACE(attachment_path, CHAR(92), '/') = %s LIMIT 1",
                (normalized_file_path,),
            )
            row = cursor2.fetchone()
            if row:
                invoice_doc = row.get("attachment_path")

            cursor2.execute(
                "SELECT file_path FROM bank_statements WHERE is_active = 1 AND REPLACE(file_path, CHAR(92), '/') = %s LIMIT 1",
                (normalized_file_path,),
            )
            row = cursor2.fetchone()
            if row:
                statement_doc = row.get("file_path")

            cursor2.close()

        result["invoice_document_url"] = invoice_doc
        result["statement_file_url"] = statement_doc

        doc_type = (result.get("document_type") or "").upper()
        if doc_type == "BANK_STATEMENT":
            source_url = statement_doc or file_path
        elif doc_type == "INVOICE":
            source_url = invoice_doc or file_path
        else:
            source_url = file_path

        result["document_url"] = self.normalize_document_url(source_url)

        return result

    def update_document(
        self,
        document_id: int,
        payload: dict
    ):

        cursor = self.db.cursor()

        query = f"""
        UPDATE {self.TABLE_NAME}
        SET extracted_json=%s
        WHERE id=%s
        """

        cursor.execute(
            query,
            (
                json.dumps(payload, ensure_ascii=False),
                document_id
            )
        )

        self.db.commit()

        return self.get_result(document_id)

    def delete_document(
        self,
        document_id: int
    ):
        cursor = self.db.cursor()

        # Get the file path first
        cursor.execute(f"SELECT file_path FROM {self.TABLE_NAME} WHERE id=%s", (document_id,))
        row = cursor.fetchone()

        # Soft delete parent document
        query = f"""
        UPDATE {self.TABLE_NAME}
        SET is_active = 0
        WHERE id=%s
        """
        cursor.execute(query, (document_id,))

        if row:
            file_path = row[0]
            if file_path:
                # invoices/bank_statements have no document_id column - match by the stored file path instead
                cursor.execute("UPDATE invoices SET is_active = 0 WHERE attachment_path = %s", (file_path,))
                cursor.execute("UPDATE bank_statements SET is_active = 0 WHERE file_path = %s", (file_path,))
                cursor.execute(
                    """
                    UPDATE bank_transactions
                    SET is_active = 0
                    WHERE bank_statement_id IN (
                        SELECT id FROM bank_statements WHERE file_path = %s
                    )
                    """,
                    (file_path,),
                )

        self.db.commit()

        return {
            "message": "Document deleted successfully."
        }

    def get_document_by_uuid(self, document_id: str) -> Optional[dict]:
        cursor = self.db.cursor(dictionary=True)
        query = f"""
        SELECT *
        FROM {self.TABLE_NAME}
        WHERE document_id=%s AND is_active = 1
        """
        cursor.execute(query, (document_id,))
        return cursor.fetchone()

    def document_id_exists(self, document_id: str) -> bool:
        cursor = self.db.cursor()
        query = f"""
        SELECT 1
        FROM {self.TABLE_NAME}
        WHERE document_id = %s
        LIMIT 1
        """
        cursor.execute(query, (document_id,))
        return cursor.fetchone() is not None

    def get_or_create_vendor(self, vendor_name: str, association_id: int = None) -> int:
        if not vendor_name:
            vendor_name = "Unknown Vendor"

        # The vendors table now requires a NOT NULL association_id (FK -> condo_associations).
        # Fall back to the first available association when none is supplied.
        if not association_id:
            association_id = self.get_first_association_id()

        cursor = self.db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id FROM vendors WHERE association_id = %s AND vendor_name = %s",
            (association_id, vendor_name),
        )
        vendor = cursor.fetchone()
        if vendor:
            return vendor["id"]

        cursor.execute("""
            INSERT INTO vendors (association_id, vendor_name, category, status)
            VALUES (%s, %s, 'General', 'Active')
        """, (association_id, vendor_name))
        self.db.commit()
        return cursor.lastrowid

    def vendor_exists(self, vendor_id: int) -> bool:
        cursor = self.db.cursor()
        cursor.execute("SELECT 1 FROM vendors WHERE id = %s LIMIT 1", (vendor_id,))
        return cursor.fetchone() is not None

    def find_vendor_by_name(
        self, vendor_name: Optional[str], association_id: Optional[int] = None
    ) -> Optional[dict]:
        """Look up a vendor by name WITHOUT creating one.

        Tries an exact (case/space-insensitive) match first - scoped to the
        association when supplied - then falls back to a contains-match (mirrors
        the email module's _lookup_vendor_id). Returns None when nothing matches.
        """
        name = (vendor_name or "").strip()
        if not name:
            return None

        cursor = self.db.cursor(dictionary=True)

        if association_id:
            cursor.execute(
                "SELECT * FROM vendors "
                "WHERE association_id = %s AND LOWER(TRIM(vendor_name)) = LOWER(TRIM(%s)) "
                "LIMIT 1",
                (association_id, name),
            )
            row = cursor.fetchone()
            if row:
                return row

        cursor.execute(
            "SELECT * FROM vendors WHERE LOWER(TRIM(vendor_name)) = LOWER(TRIM(%s)) LIMIT 1",
            (name,),
        )
        row = cursor.fetchone()
        if row:
            return row

        cursor.execute(
            "SELECT * FROM vendors "
            "WHERE %s LIKE CONCAT('%%', vendor_name, '%%') "
            "   OR vendor_name LIKE CONCAT('%%', %s, '%%') "
            "LIMIT 1",
            (name, name),
        )
        return cursor.fetchone()

    def record_document_hashes(
        self, document_id: int, content_hash: Optional[str], prompt_hash: Optional[str]
    ) -> None:
        """Best-effort bookkeeping for re-upload dedup. No-ops if the
        content_hash / prompt_hash columns have not been added yet."""
        if not content_hash and not prompt_hash:
            return
        try:
            cursor = self.db.cursor()
            cursor.execute(
                f"UPDATE {self.TABLE_NAME} SET content_hash = %s, prompt_hash = %s WHERE id = %s",
                (content_hash, prompt_hash, document_id),
            )
            self.db.commit()
        except Exception as exc:  # column missing / older schema
            logger.debug("Skipping document hash bookkeeping: %s", exc)
            try:
                self.db.rollback()
            except Exception:
                pass

    def find_reusable_extraction(
        self,
        content_hash: Optional[str],
        prompt_hash: Optional[str],
        exclude_id: Optional[int] = None,
    ) -> Optional[dict]:
        """Return {extracted_json, ocr_text} of a previously extracted document
        with identical content and the same prompt version, or None."""
        if not content_hash or not prompt_hash:
            return None
        try:
            cursor = self.db.cursor(dictionary=True)
            cursor.execute(
                f"""
                SELECT extracted_json, ocr_text
                FROM {self.TABLE_NAME}
                WHERE content_hash = %s
                  AND prompt_hash = %s
                  AND extracted_json IS NOT NULL
                  AND is_active = 1
                  AND (%s IS NULL OR id <> %s)
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (content_hash, prompt_hash, exclude_id, exclude_id or 0),
            )
            row = cursor.fetchone()
        except Exception as exc:  # column missing / older schema
            logger.debug("Skipping reusable-extraction lookup: %s", exc)
            try:
                self.db.rollback()
            except Exception:
                pass
            return None

        if not row:
            return None

        raw = row.get("extracted_json")
        if isinstance(raw, str):
            try:
                row["extracted_json"] = json.loads(raw)
            except json.JSONDecodeError:
                row["extracted_json"] = {}
        return row

    def get_first_association_id(self) -> int:
        cursor = self.db.cursor()
        cursor.execute("SELECT id FROM condo_associations ORDER BY id LIMIT 1")
        row = cursor.fetchone()
        return row[0] if row else 1

    @staticmethod
    def _normalize_account_number(account_number: str | None) -> str:
        if account_number is None:
            return ""

        normalized = "".join(ch for ch in str(account_number).strip() if ch.isalnum())
        return normalized.lower()

    @staticmethod
    def _normalize_bank_name(bank_name: str | None) -> str:
        return " ".join(str(bank_name or "").strip().lower().split())

    def bank_account_exists(self, bank_account_id: int) -> bool:
        cursor = self.db.cursor()
        cursor.execute(
            "SELECT 1 FROM bank_accounts WHERE id = %s AND is_active = 1 LIMIT 1",
            (bank_account_id,),
        )
        return cursor.fetchone() is not None

    def get_or_create_bank_account(
        self,
        *,
        association_id: int,
        bank_name: str | None = None,
        account_number: str | None = None,
        account_holder: str | None = None,
        statement_type: str | None = None,
        created_by: int | None = None,
    ) -> int:
        cursor = self.db.cursor(dictionary=True)

        normalized_bank_name = self._normalize_bank_name(bank_name)
        normalized_account_number = self._normalize_account_number(account_number)

        cursor.execute(
            """
            SELECT id, bank_name, account_number, account_name
            FROM bank_accounts
            WHERE association_id = %s AND is_active = 1
            ORDER BY id
            """,
            (association_id,),
        )
        existing_accounts = cursor.fetchall()

        if normalized_account_number:
            for account in existing_accounts:
                if self._normalize_account_number(account.get("account_number")) == normalized_account_number:
                    return account["id"]

        if normalized_bank_name:
            for account in existing_accounts:
                if self._normalize_bank_name(account.get("bank_name")) == normalized_bank_name:
                    if not normalized_account_number:
                        return account["id"]

        account_type = "Money_Market" if "money" in str(statement_type or "").lower() and "market" in str(statement_type or "").lower() else "Checking"

        account_name_parts = [
            str(account_holder or "").strip(),
            str(bank_name or "").strip(),
            str(account_number or "").strip(),
        ]
        account_name = next((part for part in account_name_parts if part), "Bank Account")
        if len(account_name) > 100:
            account_name = account_name[:100]

        insert_cursor = self.db.cursor()
        insert_cursor.execute(
            """
            INSERT INTO bank_accounts (
                association_id,
                account_name,
                account_type,
                bank_name,
                account_number,
                created_by,
                updated_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                association_id,
                account_name,
                account_type,
                bank_name,
                account_number,
                created_by,
                created_by,
            ),
        )
        self.db.commit()

        new_account_id = insert_cursor.lastrowid
        self.audit.log(
            table_name="bank_accounts",
            record_id=new_account_id,
            action=ACTION_CREATE,
            new_values={
                "id": new_account_id,
                "association_id": association_id,
                "account_name": account_name,
                "account_type": account_type,
                "bank_name": bank_name,
                "account_number": account_number,
                "created_by": created_by,
            },
            acted_by=created_by,
        )
        return new_account_id

    def get_gmail_import_log_id(
        self,
        association_id: int | None = None,
        file_path: str | None = None,
        original_file_name: str | None = None,
    ) -> int | None:
        cursor = self.db.cursor(dictionary=True)
        normalized_path = self.normalize_storage_path(file_path)
        original_path = str(file_path).strip() if file_path else None
        normalized_name = None

        if original_file_name:
            normalized_name = os.path.basename(str(original_file_name).replace("\\", "/").strip()) or None
        elif normalized_path:
            normalized_name = os.path.basename(normalized_path.replace("\\", "/").strip()) or None

        if not original_path and not normalized_path and not normalized_name:
            return None

        association_filter = ""
        params: list[object] = []
        if association_id:
            association_filter = "association_id = %s AND "
            params.append(association_id)

        if original_path or normalized_path:
            path_values = []
            if original_path:
                path_values.extend([original_path, original_path.replace("\\", "/")])
            if normalized_path:
                path_values.extend([normalized_path, normalized_path.replace("\\", "/")])
            path_values = list(dict.fromkeys(path_values))

            placeholders = ", ".join(["%s"] * len(path_values))
            cursor.execute(
                f"""
                SELECT id
                FROM gmail_import_logs
                WHERE {association_filter}REPLACE(doc_url, CHAR(92), '/') IN ({placeholders})
                ORDER BY id DESC
                LIMIT 1
                """,
                params + path_values,
            )
            exact_match = cursor.fetchone()
            if exact_match:
                return exact_match["id"]

        if normalized_name:
            cursor.execute(
                f"""
                SELECT id
                FROM gmail_import_logs
                WHERE {association_filter}SUBSTRING_INDEX(REPLACE(doc_url, CHAR(92), '/'), '/', -1) = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                params + [normalized_name],
            )
            basename_match = cursor.fetchone()
            if basename_match:
                return basename_match["id"]

        return None

    def create_invoice_record(
        self,
        vendor_id: int,
        invoice_number: str,
        amount: float,
        invoice_date: str,
        due_date: str,
        file_path: str,
        document_db_id: int = None,
        association_id: int = None,
        created_by: int = None,
        source: str = "Manual",
        gmail_import_id: int | None = None,
    ) -> int:
        cursor = self.db.cursor(dictionary=True)
        if document_db_id is not None:
            cursor.execute(
                "SELECT id FROM invoices WHERE document_extraction_id = %s LIMIT 1",
                (document_db_id,),
            )
            existing = cursor.fetchone()
        else:
            existing = None

        normalized_path = self.normalize_storage_path(file_path)

        if not association_id:
            association_id = self.get_first_association_id()

        actor = created_by

        if existing:
            query = """
            UPDATE invoices
            SET association_id = %s, vendor_id = %s, amount = %s, invoice_date = %s, due_date = %s, 
                source = %s, gmail_import_id = %s,
                attachment_path = %s, document_extraction_id = %s, updated_by = %s,
                version = version + 1
            WHERE id = %s
            """
            cursor.execute(query, (
                association_id,
                vendor_id,
                amount,
                invoice_date,
                due_date,
                source,
                gmail_import_id,
                normalized_path,
                document_db_id,
                actor,
                existing["id"],
            ))
            self.db.commit()
            new_values = {
                "id": existing["id"],
                "association_id": association_id,
                "vendor_id": vendor_id,
                "amount": amount,
                "invoice_date": str(invoice_date) if invoice_date else None,
                "due_date": str(due_date) if due_date else None,
                "source": source,
                "gmail_import_id": gmail_import_id,
                "attachment_path": normalized_path,
                "document_extraction_id": document_db_id,
                "updated_by": actor,
            }
            self.audit.log(
                table_name="invoices",
                record_id=existing["id"],
                action=ACTION_UPDATE,
                new_values=new_values,
                acted_by=actor,
                invoice_id=existing["id"],
                vendor_id=vendor_id,
                document_extraction_id=document_db_id,
            )
            return existing["id"]
        else:
            query = """
            INSERT INTO invoices (invoice_number, association_id, vendor_id, amount, invoice_date, due_date, 
                                 status, source, gmail_import_id, attachment_path, created_by, 
                                 document_extraction_id)
            VALUES (%s, %s, %s, %s, %s, %s, 'Pending', %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                invoice_number,
                association_id,
                vendor_id,
                amount,
                invoice_date,
                due_date,
                source,
                gmail_import_id,
                normalized_path,
                actor,
                document_db_id,
            ))
            self.db.commit()
            new_invoice_id = cursor.lastrowid
            new_values = {
                "id": new_invoice_id,
                "invoice_number": invoice_number,
                "association_id": association_id,
                "vendor_id": vendor_id,
                "amount": amount,
                "invoice_date": str(invoice_date) if invoice_date else None,
                "due_date": str(due_date) if due_date else None,
                "status": "Pending",
                "source": source,
                "gmail_import_id": gmail_import_id,
                "attachment_path": normalized_path,
                "created_by": actor,
                "document_extraction_id": document_db_id,
            }
            self.audit.log(
                table_name="invoices",
                record_id=new_invoice_id,
                action=ACTION_CREATE,
                new_values=new_values,
                acted_by=actor,
                invoice_id=new_invoice_id,
                vendor_id=vendor_id,
                document_extraction_id=document_db_id,
            )
            return new_invoice_id

    def create_bank_statement_record(
        self,
        file_name: str,
        period_month: int,
        period_year: int,
        transaction_count: int,
        file_path: str,
        association_id: int = None,
        document_extraction_id: int = None,
        bank_account_id: int = None,
        statement_period: str = None,
        notes: str = None,
        uploaded_by: int = None,
    ) -> int:
        cursor = self.db.cursor(dictionary=True)
        # Match by file_path to check for existing statements
        cursor.execute("SELECT id FROM bank_statements WHERE file_path = %s", (file_path,))
        existing = cursor.fetchone()

        created_by = uploaded_by
        normalized_path = self.normalize_storage_path(file_path)
        
        # The bank_statements table requires a NOT NULL association_id (FK -> condo_associations).
        # Fall back to the first available association when none is supplied.
        if not association_id:
            association_id = self.get_first_association_id()
        
        # Parse statement_period string to date if provided
        statement_period_date = None
        if statement_period:
            try:
                from datetime import datetime
                statement_period_date = datetime.strptime(statement_period, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass

        if existing:
            query = """
            UPDATE bank_statements
            SET statement_name = %s,
                association_id = %s,
                document_extraction_id = %s,
                bank_account_id = %s,
                statement_period = %s,
                period_month = %s,
                transaction_count = %s,
                notes = %s,
                file_path = %s,
                uploaded_by = %s,
                status = 'Processed',
                updated_by = %s
            WHERE id = %s
            """
            cursor.execute(query, (
                file_name,
                association_id,
                document_extraction_id,
                bank_account_id,
                statement_period_date,
                period_month,
                transaction_count,
                notes,
                normalized_path,
                uploaded_by or created_by,
                uploaded_by or created_by,
                existing["id"]
            ))
            self.db.commit()
            new_values = {
                "id": existing["id"],
                "statement_name": file_name,
                "association_id": association_id,
                "document_extraction_id": document_extraction_id,
                "bank_account_id": bank_account_id,
                "statement_period": str(statement_period_date) if statement_period_date else None,
                "period_month": period_month,
                "transaction_count": transaction_count,
                "notes": notes,
                "file_path": normalized_path,
                "uploaded_by": uploaded_by or created_by,
                "status": "Processed",
                "updated_by": uploaded_by or created_by,
            }
            self.audit.log(
                table_name="bank_statements",
                record_id=existing["id"],
                action=ACTION_UPDATE,
                new_values=new_values,
                acted_by=uploaded_by or created_by,
                bank_statement_id=existing["id"],
                document_extraction_id=document_extraction_id,
            )
            return existing["id"]
        else:
            query = """
            INSERT INTO bank_statements (
                statement_name, association_id, document_extraction_id, bank_account_id,
                statement_period, period_month, transaction_count, notes, file_path,
                uploaded_by, uploaded_on, status, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'Processed', %s)
            """
            cursor.execute(query, (
                file_name,
                association_id,
                document_extraction_id,
                bank_account_id,
                statement_period_date,
                period_month,
                transaction_count,
                notes,
                normalized_path,
                uploaded_by or created_by,
                created_by
            ))
            self.db.commit()
            new_statement_id = cursor.lastrowid
            new_values = {
                "id": new_statement_id,
                "statement_name": file_name,
                "association_id": association_id,
                "document_extraction_id": document_extraction_id,
                "bank_account_id": bank_account_id,
                "statement_period": str(statement_period_date) if statement_period_date else None,
                "period_month": period_month,
                "transaction_count": transaction_count,
                "notes": notes,
                "file_path": normalized_path,
                "uploaded_by": uploaded_by or created_by,
                "status": "Processed",
                "created_by": created_by,
            }
            self.audit.log(
                table_name="bank_statements",
                record_id=new_statement_id,
                action=ACTION_CREATE,
                new_values=new_values,
                acted_by=created_by,
                bank_statement_id=new_statement_id,
                document_extraction_id=document_extraction_id,
            )
            return new_statement_id

    def create_bank_transaction_records(
        self,
        bank_statement_id: int,
        transactions: list,
        document_extraction_id: int = None,
        created_by: int = None,
    ):
        cursor = self.db.cursor()
        cursor.execute("DELETE FROM bank_transactions WHERE bank_statement_id = %s", (bank_statement_id,))
        
        query = """
        INSERT INTO bank_transactions (
            bank_statement_id, document_extraction_id, transaction_date, description,
            transaction_type, transaction_method, amount, reference, reconciled, created_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, %s)
        """
        actor = created_by
        for tx in transactions:
            cursor.execute(query, (
                bank_statement_id,
                document_extraction_id,
                tx.get("transaction_date"),
                tx.get("description"),
                tx.get("transaction_type", "Credit"),
                tx.get("transaction_method"),
                tx.get("amount", 0.0),
                tx.get("reference"),
                actor
            ))
        self.db.commit()

    def get_documents_with_filters(
        self,
        document_id: Optional[str] = None,
        vendor_name: Optional[str] = None,
        doc_type: Optional[str] = None,
        status: Optional[str] = None,
        uploaded_from: Optional[str] = None,
        uploaded_to: Optional[str] = None
    ) -> list:
        cursor = self.db.cursor(dictionary=True)
        
        query = """
        SELECT 
            d.document_id,
            d.document_name,
            d.vendor_name,
            d.document_type as doc_type,
            d.created_at as uploaded_on,
            d.uploaded_by,
            u.full_name as uploaded_by_name,
            d.status as ext_status,
            i.status as invoice_status,
            b.status as statement_status
        FROM document_extraction d
        LEFT JOIN users u ON d.uploaded_by = u.id
        LEFT JOIN invoices i ON d.file_path = i.attachment_path AND i.is_active = 1
        LEFT JOIN bank_statements b ON d.file_path = b.file_path AND b.is_active = 1
        WHERE d.is_active = 1
        """
        params = []
        
        if document_id:
            query += " AND d.document_id = %s"
            params.append(document_id)
            
        if vendor_name:
            query += " AND d.vendor_name LIKE %s"
            params.append(f"%{vendor_name}%")
            
        if doc_type:
            query += " AND d.document_type = %s"
            params.append(doc_type)
            
        if uploaded_from:
            query += " AND d.created_at >= %s"
            params.append(uploaded_from)
            
        if uploaded_to:
            query += " AND d.created_at <= %s"
            params.append(uploaded_to)
            
        query += " ORDER BY d.created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            ext_status = row["ext_status"]
            doc_type_val = row["doc_type"]
            
            mapped_status = "Processing"
            if ext_status == "FAILED":
                mapped_status = "Failed"
            elif ext_status in ("PROCESSING", "PENDING"):
                mapped_status = "Processing"
            elif ext_status == "COMPLETED":
                if doc_type_val == "BANK_STATEMENT":
                    statement_status = row["statement_status"] or "Completed"
                    if statement_status.lower() == "processing":
                        mapped_status = "Processing"
                    elif statement_status.lower() == "failed":
                        mapped_status = "Failed"
                    else:
                        mapped_status = "Completed"
                else:
                    invoice_status = row["invoice_status"] or "Pending"
                    if invoice_status.lower() == "approved":
                        mapped_status = "Approved"
                    elif invoice_status.lower() == "rejected":
                        mapped_status = "Rejected"
                    else:
                        mapped_status = "Completed"
                        
            record = {
                "document_id": row["document_id"],
                "document_name": row["document_name"],
                "vendor_name": row["vendor_name"],
                "doc_type": doc_type_val,
                "uploaded_on": row["uploaded_on"].isoformat() if row["uploaded_on"] else None,
                "uploaded_by": row["uploaded_by"],
                "uploaded_by_name": row.get("uploaded_by_name") or self.SYSTEM_USER_NAME,
                "status": mapped_status
            }
            
            if status:
                if mapped_status.lower() == status.lower():
                    results.append(record)
            else:
                results.append(record)
                
        return results
