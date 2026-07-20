from __future__ import annotations

import logging
from pathlib import Path

from google.api_core.exceptions import GoogleAPICallError
from google.api_core.exceptions import RetryError
from google.cloud import documentai

from app.core.config import settings

logger = logging.getLogger(__name__)


class OCRService:

    SUPPORTED_MIME_TYPES = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".webp": "image/webp",
    }

    def __init__(self) -> None:

        self.project_id = settings.GCP_PROJECT_ID
        self.location = settings.GCP_LOCATION
        self.processor_id = settings.GCP_PROCESSOR_ID

        self._validate_configuration()

        self.client = documentai.DocumentProcessorServiceClient()

        logger.info("Google Document AI OCR Service initialized.")

    def extract_text(
        self,
        file_path: str,
    ) -> str:

        self._validate_file(file_path)

        mime_type = self._get_mime_type(file_path)

        logger.info(
            "Starting OCR extraction for %s",
            file_path,
        )

        processor_name = self.client.processor_path(
            self.project_id,
            self.location,
            self.processor_id,
        )

        with open(file_path, "rb") as file:
            document = file.read()

        request = documentai.ProcessRequest(
            name=processor_name,
            raw_document=documentai.RawDocument(
                content=document,
                mime_type=mime_type,
            ),
        )

        try:

            result = self.client.process_document(
                request=request,
            )

        except (GoogleAPICallError, RetryError):

            logger.exception(
                "Document AI request failed."
            )

            raise

        except Exception:

            logger.exception(
                "Unexpected OCR processing error."
            )

            raise

        extracted_text = result.document.text or ""

        if not extracted_text.strip():

            logger.warning(
                "Document AI returned empty OCR text."
            )

        logger.info(
            "OCR extraction completed successfully."
        )

        return extracted_text

    def _validate_configuration(self) -> None:

        if not all(
            [
                self.project_id,
                self.location,
                self.processor_id,
            ]
        ):

            raise ValueError(
                "Google Document AI configuration is incomplete."
            )

    @staticmethod
    def _validate_file(
        file_path: str,
    ) -> None:

        path = Path(file_path)

        if not path.exists():

            raise FileNotFoundError(
                f"File not found: {file_path}"
            )

        if not path.is_file():

            raise ValueError(
                f"Invalid file: {file_path}"
            )

    @classmethod
    def _get_mime_type(
        cls,
        file_path: str,
    ) -> str:
        """
        Determine MIME type from file extension.
        """

        extension = Path(file_path).suffix.lower()

        try:

            return cls.SUPPORTED_MIME_TYPES[extension]

        except KeyError:

            raise ValueError(
                f"Unsupported file type: {extension}"
            ) from None


ocr_service = OCRService()