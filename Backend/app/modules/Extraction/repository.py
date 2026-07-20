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
        status: str
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
            status
        )
        VALUES
        (
            %s,%s,%s,%s,%s,%s,%s
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
                status
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
        WHERE id=%s
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

        query = f"""
        DELETE
        FROM {self.TABLE_NAME}
        WHERE id=%s
        """

        cursor.execute(query, (document_id,))

        self.db.commit()

        return {
            "message": "Document deleted successfully."
        }