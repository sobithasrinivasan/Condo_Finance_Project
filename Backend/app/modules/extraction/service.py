import logging
import os
import datetime
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.settings import settings
from app.modules.extraction.engine import ExtractionEngine
from app.modules.extraction.registry import ExtractorRegistry
from app.modules.extraction.repository import ExtractionRepository
from app.modules.extraction.schema_validator import SchemaValidator
from app.modules.ocr.service import OCRService
from app.prompt.manager import PromptManager

logger = logging.getLogger(__name__)


def is_trusted_local_email_path(path: str) -> bool:

    roots = settings.email_ingestion_allowed_roots_list
    if not roots:
        return False

    try:
        resolved = Path(path).resolve()
    except (OSError, RuntimeError, ValueError):
        return False
    resolved_str = str(resolved).lower() if os.name == 'nt' else str(resolved)

    for root in roots:
        try:
            root_path = Path(root).resolve()
            root_str = str(root_path).lower() if os.name == 'nt' else str(root_path)
            
            if resolved_str.startswith(root_str + os.sep) or resolved_str == root_str:
                return True
        except (OSError, RuntimeError, ValueError):
            continue

    return False


class ExtractionService:
    SUPPORTED_UPLOAD_EXTENSIONS = sorted({*OCRService.SUPPORTED_MIME_TYPES.keys(), ".docx"})
    ALLOWED_SOURCES = {"UPLOAD", "EMAIL"}
    DOCUMENT_TYPE_ALIASES = {
        "BANKSTATEMENT": "BANK_STATEMENT",
        "BANK_STATEMENTS": "BANK_STATEMENT",
        "STATEMENT": "BANK_STATEMENT",
        "STATEMENTS": "BANK_STATEMENT",
        "INVOICES": "INVOICE",
    }
    DOCUMENT_ID_PREFIXES = {
        "BANK_STATEMENT": "BST",
        "INVOICE": "INV",
    }

    def __init__(self, db):
        self.db = db
        self.repo = ExtractionRepository(db)
        try:
            self.ocr = OCRService()
        except Exception as exc:
            logger.warning(
                "Failed to initialize OCRService: %s. OCR-based extraction will be unavailable for PDF/image files.",
                exc,
            )
            self.ocr = None
        self.engine = ExtractionEngine()
        self.prompt_manager = PromptManager()

    async def upload_document(
        self,
        file: UploadFile,
        document_type: str,
        source: str = "UPLOAD",
        vendor_id: int | None = None,
        vendor_name: str | None = None,
        uploaded_by: int | None = None,
    ):
        normalized_document_type = self._validate_document_type(document_type)
        normalized_source = self._normalize_source(source)
        normalized_vendor_name = self._normalize_optional_text(vendor_name)
        safe_file_name = self._validate_upload_filename(file.filename)
        file_id = self._generate_document_id(normalized_document_type)

        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)

        filename = f"{file_id}_{safe_file_name}"
        file_path = os.path.join(settings.UPLOAD_FOLDER, filename)

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        db_id = self.repo.create_document(
            file_id=file_id,
            file_name=safe_file_name,
            file_path=file_path,
            document_type=normalized_document_type,
            source=normalized_source,
            status="PROCESSING",
            vendor_id=vendor_id,
            vendor_name=normalized_vendor_name,
            uploaded_by=uploaded_by,
        )

        return {
            "document_id": file_id,
            "db_id": db_id,
            "status": "PROCESSING",
            "document_type": normalized_document_type,
            "source": normalized_source,
        }

    def upload_link_document(
        self,
        url: str,
        document_type: str,
        source: str = "EMAIL",
        vendor_id: int | None = None,
        vendor_name: str | None = None,
        uploaded_by: int | None = None,
    ):
        normalized_document_type = self._validate_document_type(document_type)
        normalized_source = self._normalize_source(source)
        normalized_vendor_name = self._normalize_optional_text(vendor_name)
        file_id = self._generate_document_id(normalized_document_type)

        if url.lower().startswith(("http://", "https://")):
            import urllib.parse

            parsed_url = urllib.parse.urlparse(url)
            original_filename = os.path.basename(parsed_url.path)
        else:
            original_filename = os.path.basename(url.replace("\\", "/"))

        if not original_filename or "." not in original_filename:
            original_filename = "document.pdf"

        safe_file_name = self._validate_upload_filename(original_filename)

        db_id = self.repo.create_document(
            file_id=file_id,
            file_name=safe_file_name,
            file_path=url,
            document_type=normalized_document_type,
            source=normalized_source,
            status="PROCESSING",
            vendor_id=vendor_id,
            vendor_name=normalized_vendor_name,
            uploaded_by=uploaded_by,
        )

        return {
            "document_id": file_id,
            "db_id": db_id,
            "status": "PROCESSING",
            "document_type": normalized_document_type,
            "source": normalized_source,
        }

    def process_document(self, document_id: int):
        document = self.repo.get_document(document_id)
        if not document:
            logger.error("Document with ID %s not found in database.", document_id)
            return None

        file_path = document["file_path"]

        if file_path.startswith("http://") or file_path.startswith("https://"):
            import requests

            try:
                logger.info("Downloading file from URL: %s", file_path)
                response = requests.get(file_path, timeout=60)
                response.raise_for_status()

                os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
                local_filename = f"{document['document_id']}_{document['document_name']}"
                local_path = os.path.join(settings.UPLOAD_FOLDER, local_filename)

                with open(local_path, "wb") as buffer:
                    buffer.write(response.content)

                cursor = self.db.cursor()
                cursor.execute(
                    "UPDATE document_extraction SET file_path = %s WHERE id = %s",
                    (local_path, document_id),
                )
                self.db.commit()

                document["file_path"] = local_path
                file_path = local_path
                logger.info("Downloaded URL content successfully to %s", local_path)
            except Exception as dl_err:
                logger.exception("Failed to download file from URL %s: %s", file_path, dl_err)
                self.repo.update_status(document_id, "FAILED", f"File download failed: {dl_err}")
                raise

        extractor = ExtractorRegistry.get_extractor(document["document_type"])

        ocr_text = ""
        result = {}

        ext = os.path.splitext(file_path)[1].lower()
        is_docx = ext == ".docx"

        if is_docx:
            logger.info("Extracting text from DOCX Word document...")
            try:
                ocr_text = self._extract_text_from_docx(file_path)
                ocr_text = extractor.pre_process(ocr_text)

                result = self._run_extraction(document["document_type"], ocr_text)
            except Exception as docx_err:
                logger.exception("DOCX extraction failed: %s", docx_err)
                self.repo.update_status(document_id, "FAILED", str(docx_err))
                raise
        else:
            gcp_configured = (
                self.ocr is not None
                and settings.GCP_PROJECT_ID
                and (
                    settings.GCP_PROCESSOR_ID
                    or settings.GCP_FORM_PROCESSOR_ID
                    or settings.GCP_LAYOUT_PROCESSOR_ID
                )
            )

            if gcp_configured:
                try:
                    logger.info("Running OCR...")
                    ocr_text = self.ocr.extract_text(
                        document["file_path"],
                        document_type=document["document_type"],
                    )

                    if not ocr_text or not ocr_text.strip():
                        raise ValueError("Document AI returned empty OCR text.")

                    ocr_text = extractor.pre_process(ocr_text)

                    result = self._run_extraction(document["document_type"], ocr_text)
                except Exception as ocr_err:
                    logger.exception("GCP Document AI or OCR extraction failed: %s", ocr_err)
                    self.repo.update_status(document_id, "FAILED", str(ocr_err))
                    raise

            if not gcp_configured:
                error_message = (
                    "OCR extraction is required for non-DOCX documents. "
                    "Configure Google Document AI correctly; direct multimodal fallback is disabled."
                )
                logger.error(error_message)
                self.repo.update_status(document_id, "FAILED", error_message)
                raise ValueError(error_message)

        result = extractor.post_process(result)

        self.repo.save_result(
            document_id=document_id,
            extracted_json=result,
            ocr_text=ocr_text,
        )

        try:
            self._populate_business_tables(document, result)
        except Exception as pop_err:
            logger.exception("Error populating business tables: %s", pop_err)
            self.repo.update_status(
                document_id,
                "COMPLETED",
                error_message=f"Extraction succeeded but table population failed: {pop_err}",
            )
            return result

        self.repo.update_status(document_id, "COMPLETED")
        return result

    def _run_extraction(self, document_type: str, ocr_text: str) -> dict:
        logger.info("Loading prompt template...")
        prompt_template = self.prompt_manager.get_prompt(document_type=document_type)

        logger.info("Running Gemini extraction with OCR text...")
        result = self.engine.extract(prompt=prompt_template, ocr_text=ocr_text)

        try:
            schema_fields = self.prompt_manager.get_schema(document_type=document_type)
            errors = SchemaValidator.validate(result, schema_fields)
            if errors:
                logger.warning(
                    "Extraction result for document_type=%s does not fully match its yaml "
                    "schema (%d issue(s)): %s. Continuing with the extracted data as-is.",
                    document_type,
                    len(errors),
                    "; ".join(errors),
                )
        except Exception:
            logger.exception(
                "Schema validation could not run for document_type=%s; "
                "continuing with unvalidated extraction result.",
                document_type,
            )

        return result

    def _populate_business_tables(self, document: dict, result: dict):
        db_uuid = document["document_id"]
        doc_type = document["document_type"]
        file_path = document["file_path"]

        if doc_type.upper() == "BANK_STATEMENT":
            data = result.get("BankStatement", {})
            if not data and "Transactions" in result:
                data = result

            acc = data.get("Account_Information", {})
            txs = data.get("Transactions", [])

            period_str = acc.get("Statement_Period", "")
            month, year = self._parse_period(period_str, txs)
            tx_count = len(txs)

            stmt_id = self.repo.create_bank_statement_record(
                file_name=document["document_name"],
                period_month=month,
                period_year=year,
                transaction_count=tx_count,
                file_path=file_path,
            )

            mapped_txs = []
            for tx in txs:
                tx_date = self._parse_date(tx.get("Date"))
                withdrawal = self._to_float(tx.get("Withdrawal"))
                deposit = self._to_float(tx.get("Deposit"))

                amount = 0.0
                tx_type = "Debit"
                if deposit > 0:
                    amount = deposit
                    tx_type = "Credit"
                elif withdrawal > 0:
                    amount = withdrawal
                    tx_type = "Debit"
                else:
                    val = tx.get("Amount")
                    if val is not None:
                        amount = abs(self._to_float(val))
                        tx_type = "Credit" if self._to_float(val) >= 0 else "Debit"

                mapped_txs.append(
                    {
                        "transaction_date": tx_date,
                        "description": tx.get("Description", "No Description"),
                        "amount": amount,
                        "type": tx_type,
                    }
                )

            self.repo.create_bank_transaction_records(stmt_id, mapped_txs)
            logger.info(
                "Successfully populated bank_statements and bank_transactions for %s",
                db_uuid,
            )
        else:
            invoice_data = result.get("Invoice", {})
            if not invoice_data and "Invoice_Information" in result:
                invoice_data = result

            v_info = invoice_data.get("Vendor_Information", {})
            inv_info = invoice_data.get("Invoice_Information", {})
            summary = invoice_data.get("Invoice_Summary", {})

            vendor_name = document.get("vendor_name") or v_info.get("Vendor_Name") or "Unknown Vendor"

            vendor_id = document.get("vendor_id")
            if not vendor_id:
                vendor_id = self.repo.get_or_create_vendor(vendor_name)

            inv_number = inv_info.get("Invoice_Number")
            if not inv_number:
                inv_number = f"INV-{document['document_id'][:8]}"

            inv_date = self._parse_date(inv_info.get("Invoice_Date"))
            due_date = self._parse_date(inv_info.get("Due_Date"))

            amount = self._to_float(summary.get("Total_Due"))
            if amount == 0.0:
                amount = self._to_float(summary.get("Subtotal"))

            notes = invoice_data.get("Additional_Information", {}).get("Notes", "")

            self.repo.create_invoice_record(
                vendor_id=vendor_id,
                invoice_number=inv_number,
                amount=amount,
                invoice_date=inv_date,
                due_date=due_date,
                notes=notes,
                file_path=file_path,
            )
            logger.info("Successfully populated invoice for %s", db_uuid)

    def _to_float(self, value) -> float:
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        try:
            clean = "".join(c for c in str(value) if c.isdigit() or c in (".", "-"))
            return float(clean)
        except ValueError:
            return 0.0

    def _parse_date(self, value) -> str:
        import datetime

        if not value:
            return datetime.date.today().strftime("%Y-%m-%d")

        val_str = str(value).strip()
        for fmt in (
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d-%b-%Y",
            "%d-%B-%Y",
        ):
            try:
                dt = datetime.datetime.strptime(val_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

        try:
            if val_str.isdigit() and len(val_str) > 8:
                dt = datetime.datetime.fromtimestamp(int(val_str[:10]))
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

        return datetime.date.today().strftime("%Y-%m-%d")

    def _parse_period(self, period_str: str, txs: list) -> tuple[int, int]:
        import datetime
        import re

        current_date = datetime.date.today()
        month = current_date.month
        year = current_date.year

        if period_str:
            months_map = {
                "january": 1,
                "february": 2,
                "march": 3,
                "april": 4,
                "may": 5,
                "june": 6,
                "july": 7,
                "august": 8,
                "september": 9,
                "october": 10,
                "november": 11,
                "december": 12,
                "jan": 1,
                "feb": 2,
                "mar": 3,
                "apr": 4,
                "jun": 6,
                "jul": 7,
                "aug": 8,
                "sep": 9,
                "oct": 10,
                "nov": 11,
                "dec": 12,
            }
            for name, mapped_month in months_map.items():
                if name in period_str.lower():
                    month = mapped_month
                    break
            match = re.search(r"\b(20\d{2})\b", period_str)
            if match:
                year = int(match.group(1))
                return month, year

        if txs and txs[0].get("Date"):
            first_tx_date = self._parse_date(txs[0].get("Date"))
            try:
                dt = datetime.datetime.strptime(first_tx_date, "%Y-%m-%d")
                return dt.month, dt.year
            except Exception:
                pass

        return month, year

    def _get_db_id(self, document_id) -> int:
        if isinstance(document_id, str) and not str(document_id).isdigit():
            doc = self.repo.get_document_by_uuid(document_id)
            return doc["id"] if doc else 0
        return int(document_id)

    def get_documents(
        self,
        document_id: str | None = None,
        vendor_name: str | None = None,
        doc_type: str | None = None,
        status: str | None = None,
        uploaded_from: str | None = None,
        uploaded_to: str | None = None,
    ):
        return self.repo.get_documents_with_filters(
            document_id=document_id,
            vendor_name=vendor_name,
            doc_type=doc_type,
            status=status,
            uploaded_from=uploaded_from,
            uploaded_to=uploaded_to,
        )

    def get_document(self, document_id):
        if isinstance(document_id, str) and not str(document_id).isdigit():
            return self.repo.get_document_by_uuid(document_id)
        return self.repo.get_document(int(document_id))

    def get_document_status(self, document_id):
        db_id = self._get_db_id(document_id)
        return self.repo.get_status(db_id)

    def get_extraction_result(self, document_id):
        db_id = self._get_db_id(document_id)
        return self.repo.get_result(db_id)

    def update_document(self, document_id, payload):
        db_id = self._get_db_id(document_id)
        return self.repo.update_document(db_id, payload)

    def delete_document(self, document_id):
        if isinstance(document_id, str) and not str(document_id).isdigit():
            doc = self.repo.get_document_by_uuid(document_id)
        else:
            doc = self.repo.get_document(int(document_id))

        if doc:
            file_path = doc.get("file_path")
            if file_path and os.path.exists(file_path) and self._owns_file(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
            return self.repo.delete_document(doc["id"])
        return {"message": "Document not found."}

    def _owns_file(self, file_path: str) -> bool:
        """True only for files under our own UPLOAD_FOLDER. Documents ingested
        from a trusted external folder (see is_trusted_local_email_path) are
        not ours to delete - deleting our extraction record must not delete
        the source file another system still owns."""

        try:
            return Path(file_path).resolve().is_relative_to(Path(settings.UPLOAD_FOLDER).resolve())
        except (OSError, RuntimeError):
            return False

    def _extract_text_from_docx(self, file_path: str) -> str:
        import docx

        try:
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        full_text.append(cell.text)
            return "\n".join(full_text)
        except Exception as exc:
            logger.exception("Failed to extract text from docx: %s", exc)
            raise

    @classmethod
    def _validate_upload_filename(cls, filename: str | None) -> str:
        safe_name = Path(filename or "").name.strip()
        if not safe_name:
            raise ValueError("Uploaded file must include a valid filename.")

        extension = Path(safe_name).suffix.lower()
        if extension not in cls.SUPPORTED_UPLOAD_EXTENSIONS:
            supported = ", ".join(cls.SUPPORTED_UPLOAD_EXTENSIONS)
            raise ValueError(
                f"Unsupported file type '{extension or '[no extension]'}'. "
                f"Supported file types: {supported}."
            )

        return safe_name

    @classmethod
    def _normalize_source(cls, source: str | None) -> str:
        normalized = cls._normalize_optional_text(source)
        normalized_source = (normalized or "UPLOAD").upper()
        if normalized_source not in cls.ALLOWED_SOURCES:
            supported = ", ".join(sorted(cls.ALLOWED_SOURCES))
            raise ValueError(
                f"Unsupported source '{source}'. Supported values: {supported}."
            )
        return normalized_source

    @classmethod
    def _normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = str(value).strip()
        if not normalized or normalized in {"null", "None"}:
            return None

        return normalized

    @classmethod
    def _normalize_document_type(cls, document_type: str) -> str:
        normalized = cls._normalize_optional_text(document_type)
        if not normalized:
            raise ValueError("document_type is required.")

        normalized = normalized.replace(" ", "_").replace("-", "_").upper()
        return cls.DOCUMENT_TYPE_ALIASES.get(normalized, normalized)

    @classmethod
    def _supported_document_types(cls) -> set[str]:
        supported = {
            document_type
            for document_type in ExtractorRegistry.supported_document_types()
            if document_type != "DEFAULT"
        }
        supported.update(PromptManager().get_supported_document_types())
        return supported

    @classmethod
    def _validate_document_type(cls, document_type: str) -> str:
        normalized = cls._normalize_document_type(document_type)
        supported_types = cls._supported_document_types()
        if normalized not in supported_types:
            supported = ", ".join(sorted(supported_types))
            raise ValueError(
                f"Unsupported document_type '{document_type}'. Supported values: {supported}."
            )
        return normalized

    def _generate_document_id(self, document_type: str) -> str:
        prefix = self.DOCUMENT_ID_PREFIXES.get(
            document_type,
            self.DOCUMENT_ID_PREFIXES["INVOICE"],
        )
        date_part = datetime.date.today().strftime("%Y%m%d")

        for _ in range(10):
            random_part = uuid.uuid4().hex[:6].upper()
            document_id = f"{prefix}-{date_part}-{random_part}"
            if not self.repo.document_id_exists(document_id):
                return document_id

        raise ValueError("Unable to generate a unique document_id. Please try again.")
