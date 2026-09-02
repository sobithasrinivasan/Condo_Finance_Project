from __future__ import annotations

import logging
from pathlib import Path

from google.api_core.exceptions import GoogleAPICallError
from google.api_core.exceptions import RetryError
from google.cloud import documentai

from app.core.settings import settings

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
        self.processor_id = (
            settings.GCP_PROCESSOR_ID
            or settings.GCP_FORM_PROCESSOR_ID
            or settings.GCP_LAYOUT_PROCESSOR_ID
        )

        self._validate_configuration()

        self.client = documentai.DocumentProcessorServiceClient()

        logger.info("Google Document AI OCR Service initialized.")

    def extract_text(
        self,
        file_path: str,
        document_type: str | None = None,
    ) -> str:

        resolved_path = self._resolve_file_path(file_path)
        self._validate_file(resolved_path)

        mime_type = self._get_mime_type(resolved_path)
        doc_type_upper = (document_type or "").strip().replace(" ", "_").replace("-", "_").upper()
        processor_candidates = self._get_processor_candidates(doc_type_upper)

        last_error = None
        for processor_id in processor_candidates:
            if not processor_id:
                continue

            logger.info(
                "Starting OCR extraction for %s using processor ID: %s",
                resolved_path,
                processor_id,
            )

            processor_name = self.client.processor_path(
                self.project_id,
                self.location,
                processor_id,
            )

            with open(resolved_path, "rb") as file:
                document = file.read()

            request = documentai.ProcessRequest(
                name=processor_name,
                raw_document=documentai.RawDocument(
                    content=document,
                    mime_type=mime_type,
                ),
                process_options=documentai.ProcessOptions(
                    ocr_config=documentai.OcrConfig(
                        enable_native_pdf_parsing=(mime_type == "application/pdf"),
                        enable_image_quality_scores=True,
                    ),
                ),
            )

            try:
                result = self.client.process_document(request=request)
            except (GoogleAPICallError, RetryError):
                logger.exception("Document AI request failed for processor_id=%s.", processor_id)
                last_error = ValueError("Document AI request failed.")
                continue
            except Exception:
                logger.exception("Unexpected OCR processing error for processor_id=%s.", processor_id)
                last_error = ValueError("Unexpected OCR processing error.")
                continue

            extracted_text = result.document.text or ""
            page_count = len(result.document.pages)

            if extracted_text.strip():
                logger.info(
                    "OCR extraction completed successfully. pages=%s text_length=%s processor_id=%s",
                    page_count,
                    len(extracted_text),
                    processor_id,
                )
                return extracted_text

            logger.warning(
                "Document AI returned empty OCR text. processor_id=%s mime_type=%s pages=%s entities=%s",
                processor_id,
                mime_type,
                page_count,
                len(getattr(result.document, "entities", [])),
            )
            last_error = ValueError("Document AI returned empty OCR text.")

        fallback_text = self._fallback_extract_pdf_text(resolved_path)
        if fallback_text and fallback_text.strip():
            logger.warning(
                "Using PDF fallback text extraction because Document AI did not return OCR text.")
            return fallback_text

        if last_error is not None:
            raise last_error

        raise ValueError("Document AI returned empty OCR text.")

    def _get_processor_candidates(self, doc_type_upper: str) -> list[str]:
        if doc_type_upper in {"BANK_STATEMENT", "BANKSTATEMENT", "BANK_STATEMENTS", "STATEMENT", "STATEMENTS"}:
            return [
                settings.GCP_LAYOUT_PROCESSOR_ID,
                settings.GCP_PROCESSOR_ID,
                settings.GCP_FORM_PROCESSOR_ID,
                self.processor_id,
            ]

        return [
            settings.GCP_FORM_PROCESSOR_ID,
            settings.GCP_PROCESSOR_ID,
            settings.GCP_LAYOUT_PROCESSOR_ID,
            self.processor_id,
        ]

    @staticmethod
    def _fallback_extract_pdf_text(file_path: str) -> str:
        text_parts = []
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                t = page.extract_text() or ""
                if t.strip():
                    text_parts.append(t.strip())
        except Exception:
            pass

        if text_parts:
            return "\n".join(text_parts)

        try:
            import fitz
            doc = fitz.open(file_path)
            for page in doc:
                t = page.get_text() or ""
                if t.strip():
                    text_parts.append(t.strip())
        except Exception:
            pass

        return "\n".join(text_parts) if text_parts else ""

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
    def _resolve_file_path(file_path: str) -> str:
        import os
        raw_path = str(file_path or "").strip()
        if not raw_path:
            raise FileNotFoundError("File path is empty.")

        clean_path = raw_path.replace("/", os.sep).replace("\\", os.sep)
        direct = Path(clean_path).expanduser()

        candidates = []
        if not direct.is_absolute():
            candidates.append(Path(settings.BASE_DIR) / direct)
            candidates.append(Path.cwd() / direct)
            candidates.append(Path(settings.UPLOAD_FOLDER).parent / direct)
            candidates.append(Path(settings.UPLOAD_FOLDER) / direct.name)
            candidates.append(Path(settings.UPLOAD_FOLDER) / direct)
        candidates.append(direct)

        for candidate in candidates:
            try:
                if candidate.exists() and candidate.is_file():
                    return str(candidate.resolve())
            except OSError:
                continue

        return str(direct.resolve())

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
