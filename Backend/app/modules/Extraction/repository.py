import json
from typing import Optional


class ExtractionRepository:

    TABLE_NAME = "document_extraction"

    def __init__(self, db):
        self.db = db

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
        uploaded_by: int = None
    ) -> int:

        cursor = self.db.cursor()

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
            uploaded_by
        )
        VALUES
        (
            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s
        )
        """

        cursor.execute(
            query,
            (
                file_id,
                file_name,
                document_type,
                source,
                file_name,
                file_path,
                status,
                vendor_id,
                vendor_name,
                uploaded_by
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
        WHERE id=%s AND is_deleted = 0
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

    def get_result(
        self,
        document_id: int
    ) -> Optional[dict]:

        cursor = self.db.cursor(dictionary=True)

        query = f"""
        SELECT
            id,
            document_type,
            status,
            extracted_json,
            ocr_text,
            created_at,
            updated_at
        FROM {self.TABLE_NAME}
        WHERE id=%s
        """

        cursor.execute(query, (document_id,))

        result = cursor.fetchone()

        if (
            result
            and result.get("extracted_json")
            and isinstance(result["extracted_json"], str)
        ):
            result["extracted_json"] = json.loads(
                result["extracted_json"]
            )

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
        SET is_deleted = 1
        WHERE id=%s
        """
        cursor.execute(query, (document_id,))

        if row:
            file_path = row[0]
            if file_path:
                # invoices/bank_statements have no document_id column - match by the stored file path instead
                cursor.execute("UPDATE invoices SET is_active = 0 WHERE document_url = %s", (file_path,))
                cursor.execute("UPDATE bank_statements SET is_active = 0 WHERE file_url = %s", (file_path,))
                cursor.execute(
                    """
                    UPDATE bank_transactions
                    SET is_active = 0
                    WHERE bank_statement_id IN (
                        SELECT id FROM bank_statements WHERE file_url = %s
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
        WHERE document_id=%s AND is_deleted = 0
        """
        cursor.execute(query, (document_id,))
        return cursor.fetchone()

    def get_or_create_default_user(self) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users LIMIT 1")
        user = cursor.fetchone()
        if user:
            return user["id"]
        
        # Insert a default Admin user if none exists
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, role, status)
            VALUES ('System User', 'system@condofinance.local', 'pbkdf2:sha256...', 'Board Member', 'Active')
        """)
        self.db.commit()
        return cursor.lastrowid

    def get_or_create_vendor(self, vendor_name: str) -> int:
        if not vendor_name:
            vendor_name = "Unknown Vendor"
        cursor = self.db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM vendors WHERE name = %s", (vendor_name,))
        vendor = cursor.fetchone()
        if vendor:
            return vendor["id"]
        
        cursor.execute("""
            INSERT INTO vendors (name, category, status)
            VALUES (%s, 'General', 'Active')
        """, (vendor_name,))
        self.db.commit()
        return cursor.lastrowid

    def create_invoice_record(
        self,
        vendor_id: int,
        invoice_number: str,
        amount: float,
        invoice_date: str,
        due_date: str,
        notes: str,
        file_path: str
    ) -> int:
        cursor = self.db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM invoices WHERE invoice_number = %s", (invoice_number,))
        existing = cursor.fetchone()

        if existing:
            query = """
            UPDATE invoices
            SET vendor_id = %s, amount = %s, invoice_date = %s, due_date = %s, notes = %s, document_url = %s
            WHERE id = %s
            """
            cursor.execute(query, (vendor_id, amount, invoice_date, due_date, notes, file_path, existing["id"]))
            self.db.commit()
            return existing["id"]
        else:
            created_by = self.get_or_create_default_user()
            query = """
            INSERT INTO invoices (invoice_number, vendor_id, amount, invoice_date, due_date, status, source, document_url, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, 'Pending', 'OCR', %s, %s, %s)
            """
            cursor.execute(query, (invoice_number, vendor_id, amount, invoice_date, due_date, file_path, notes, created_by))
            self.db.commit()
            return cursor.lastrowid

    def create_bank_statement_record(
        self,
        file_name: str,
        period_month: int,
        period_year: int,
        transaction_count: int,
        file_path: str
    ) -> int:
        cursor = self.db.cursor(dictionary=True)
        # bank_statements has no document_id column - match by the stored file_url instead
        cursor.execute("SELECT id FROM bank_statements WHERE file_url = %s", (file_path,))
        existing = cursor.fetchone()

        uploaded_by = self.get_or_create_default_user()

        if existing:
            query = """
            UPDATE bank_statements
            SET file_name = %s, period_month = %s, period_year = %s, transaction_count = %s, status = 'Processed'
            WHERE id = %s
            """
            cursor.execute(query, (file_name, period_month, period_year, transaction_count, existing["id"]))
            self.db.commit()
            return existing["id"]
        else:
            query = """
            INSERT INTO bank_statements (file_name, period_month, period_year, uploaded_by, status, transaction_count, file_url, created_by)
            VALUES (%s, %s, %s, %s, 'Processed', %s, %s, %s)
            """
            cursor.execute(query, (file_name, period_month, period_year, uploaded_by, transaction_count, file_path, uploaded_by))
            self.db.commit()
            return cursor.lastrowid

    def create_bank_transaction_records(
        self,
        bank_statement_id: int,
        transactions: list
    ):
        cursor = self.db.cursor()
        cursor.execute("DELETE FROM bank_transactions WHERE bank_statement_id = %s", (bank_statement_id,))
        
        query = """
        INSERT INTO bank_transactions (bank_statement_id, transaction_date, description, amount, type, ocr_verified, reconciled)
        VALUES (%s, %s, %s, %s, %s, 1, 0)
        """
        for tx in transactions:
            cursor.execute(query, (
                bank_statement_id,
                tx.get("transaction_date"),
                tx.get("description"),
                tx.get("amount"),
                tx.get("type")
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
            d.status as ext_status,
            i.status as invoice_status,
            b.status as statement_status
        FROM document_extraction d
        LEFT JOIN invoices i ON d.file_path = i.document_url AND i.is_active = 1
        LEFT JOIN bank_statements b ON d.file_path = b.file_url AND b.is_active = 1
        WHERE d.is_deleted = 0
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
                "status": mapped_status
            }
            
            if status:
                if mapped_status.lower() == status.lower():
                    results.append(record)
            else:
                results.append(record)
                
        return results