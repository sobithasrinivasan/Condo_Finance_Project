# app/modules/extraction/service.py

import os
import uuid
import logging

from fastapi import UploadFile

from app.core.settings import settings
from app.modules.extraction.engine import ExtractionEngine
from app.modules.extraction.registry import ExtractorRegistry
from app.modules.extraction.repository import ExtractionRepository
from app.modules.ocr.service import OCRService

logger = logging.getLogger(__name__)


class ExtractionService:

    def __init__(self, db):

        self.db = db
        self.repo = ExtractionRepository(db)
        self.ocr = OCRService()
        self.engine = ExtractionEngine()

    async def upload_document(
        self,
        file: UploadFile,
        document_type: str,
        source: str = "UPLOAD"
    ):

        file_id = str(uuid.uuid4())

        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)

        filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(
            settings.UPLOAD_FOLDER,
            filename
        )

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        document_id = self.repo.create_document(
            file_id=file_id,
            file_name=file.filename,
            file_path=file_path,
            document_type=document_type,
            source=source,
            status="PROCESSING"
        )

        try:
            self.process_document(document_id)

        except Exception as e:

            logger.exception(e)

            self.repo.update_status(
                document_id,
                "FAILED",
                str(e)
            )

            raise

        return {
            "document_id": document_id,
            "status": "COMPLETED"
        }

    def process_document(
        self,
        document_id: int
    ):

        document = self.repo.get_document(document_id)

        extractor = ExtractorRegistry.get_extractor(
            document["document_type"]
        )

        logger.info("Running OCR...")

        ocr_text = self.ocr.extract_text(
            document["file_path"]
        )

        ocr_text = extractor.pre_process(
            ocr_text
        )

        logger.info("Running Gemini Extraction...")

        result = self.engine.extract(
            document_type=document["document_type"],
            ocr_text=ocr_text
        )

        result = extractor.post_process(result)

        self.repo.save_result(
            document_id=document_id,
            extracted_json=result,
            ocr_text=ocr_text
        )

        self.repo.update_status(
            document_id,
            "COMPLETED"
        )

        return result

    def get_documents(self):

        return self.repo.get_documents()

    def get_document(
        self,
        document_id: int
    ):

        return self.repo.get_document(
            document_id
        )

    def get_document_status(
        self,
        document_id: int
    ):

        return self.repo.get_status(
            document_id
        )

    def get_extraction_result(
        self,
        document_id: int
    ):

        return self.repo.get_result(
            document_id
        )

    def update_document(
        self,
        document_id: int,
        payload: dict
    ):

        return self.repo.update_document(
            document_id,
            payload
        )

    def delete_document(
        self,
        document_id: int
    ):

        document = self.repo.get_document(
            document_id
        )

        if document:

            file_path = document.get("file_path")

            if file_path and os.path.exists(file_path):

                os.remove(file_path)

        return self.repo.delete_document(
            document_id
        )