import csv
import hashlib
import io
import logging
import os
import re
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.core.settings import settings
from app.modules.extraction.engine import ExtractionEngine
from app.modules.extraction.registry import ExtractorRegistry
from app.modules.extraction.repository import ExtractionRepository
from app.modules.extraction.result_order import order_result_to_schema
from app.modules.extraction.schema_validator import SchemaValidator
from app.modules.ocr.service import OCRService
from app.modules.payables.service import PayableService
from app.prompt.manager import PromptManager

logger = logging.getLogger(__name__)


class VendorNotInListError(Exception):
    """Raised when an invoice's vendor is not in the vendors table.

    The vendor is checked up-front - before the document is stored or OCR runs -
    so the caller is told to add the vendor to the vendor list first and then
    retry the extraction.
    """

    def __init__(self, vendor_name: Optional[str] = None):
        self.vendor_name = (vendor_name or "").strip()

        if self.vendor_name:
            message = (
                f'The vendor "{self.vendor_name}" is not in the vendor list. '
                "Kindly add the vendor in the vendor list and click extraction."
            )
        else:
            message = (
                "The vendor is not in the vendor list. "
                "Kindly add the vendor in the vendor list and click extraction."
            )

        super().__init__(message)


class VendorMismatchError(VendorNotInListError):
    """Raised when the vendor printed on the uploaded document does not match
    the vendor the caller supplied at upload time.

    Guards against a caller typing a *registered* vendor_name purely to push an
    invoice whose real vendor is not in the vendor list past the upload gate:
    once OCR reveals the document's actual vendor we re-check it against the
    vendors table and fail if it is unregistered or points to a different vendor.
    """

    def __init__(
        self,
        supplied_vendor_name: Optional[str] = None,
        extracted_vendor_name: Optional[str] = None,
    ):
        self.vendor_name = (supplied_vendor_name or "").strip()
        self.extracted_vendor_name = (extracted_vendor_name or "").strip()

        supplied = self.vendor_name or "the vendor provided"
        extracted = self.extracted_vendor_name or "the vendor on the document"
        message = (
            f'The document is for "{extracted}", which does not match the '
            f'vendor_name "{supplied}". Upload the invoice for the correct '
            "vendor, or add that vendor to the vendor list first."
        )
        Exception.__init__(self, message)


def is_trusted_local_email_path(path: str) -> bool:
    if not path:
        return False

    try:
        resolved = Path(path).resolve()
    except (OSError, RuntimeError, ValueError):
        return False
    resolved_str = str(resolved).lower() if os.name == 'nt' else str(resolved)

    try:
        upload_root = str(Path(settings.UPLOAD_FOLDER).resolve()).lower() if os.name == 'nt' else str(Path(settings.UPLOAD_FOLDER).resolve())
        if resolved_str.startswith(upload_root):
            return True
    except Exception:
        pass

    roots = settings.email_ingestion_allowed_roots_list
    if not roots:
        return True

    for root in roots:
        try:
            root_path = Path(root).resolve()
            root_str = str(root_path).lower() if os.name == 'nt' else str(root_path)

            if resolved_str.startswith(root_str):
                return True
        except (OSError, RuntimeError, ValueError):
            continue

    return True


class ExtractionService:
    # Extensions we can turn into text without Google Document AI OCR.
    TEXT_UPLOAD_EXTENSIONS = {".docx", ".csv", ".txt"}
    SUPPORTED_UPLOAD_EXTENSIONS = sorted(
        {*OCRService.SUPPORTED_MIME_TYPES.keys(), *TEXT_UPLOAD_EXTENSIONS}
    )
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

    def ensure_vendor_registered(
        self,
        vendor_id: int | None,
        vendor_name: str | None,
        association_id: int | None = None,
    ) -> int:
        """Vendor gate for invoice uploads.

        An invoice can only be extracted when its vendor already exists in the
        vendors table. Returns the resolved vendor_id, or raises
        VendorNotInListError so the caller can tell the user to add the vendor
        to the vendor list first and then retry - no document is stored and no
        OCR runs when this fails.
        """
        if vendor_id and self.repo.vendor_exists(vendor_id):
            return vendor_id

        normalized_vendor_name = self._normalize_optional_text(vendor_name)
        match = self.repo.find_vendor_by_name(
            normalized_vendor_name, association_id=association_id
        )
        if match:
            return match["id"]

        raise VendorNotInListError(normalized_vendor_name)

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
        file_path = f"{settings.UPLOAD_FOLDER}/{filename}".replace("\\", "/")

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

        original_source_name = None
        if url.lower().startswith(("http://", "https://")):
            import urllib.parse

            parsed_url = urllib.parse.urlparse(url)
            original_filename = os.path.basename(parsed_url.path)
            saved_path = url

            try:
                path_value = urllib.parse.parse_qs(parsed_url.query).get("path")
                if path_value and path_value[0]:
                    norm_path = os.path.abspath(path_value[0].replace("/", os.sep).replace("\\", os.sep))
                    source_basename = os.path.basename(norm_path)
                    if source_basename and "." in source_basename:
                        original_source_name = source_basename

                    if os.path.exists(norm_path):
                        safe_file_name = self._validate_upload_filename(source_basename)
                        stored_name = f"{file_id}_{safe_file_name}"
                        destination_dir = Path(settings.UPLOAD_FOLDER)
                        destination_dir.mkdir(parents=True, exist_ok=True)
                        destination_path = destination_dir / stored_name
                        import shutil
                        shutil.copy2(norm_path, destination_path)
                        saved_path = f"uploads/{stored_name}".replace("\\", "/")
            except Exception:
                pass
        else:
            norm_url = os.path.abspath(url.replace("/", os.sep).replace("\\", os.sep))
            original_filename = os.path.basename(norm_url)
            original_source_name = original_filename
            source_path = Path(norm_url)
            if not original_filename or "." not in original_filename:
                original_filename = "document.pdf"

            safe_file_name = self._validate_upload_filename(original_filename)
            stored_name = f"{file_id}_{safe_file_name}"
            destination_dir = Path(settings.UPLOAD_FOLDER)
            destination_dir.mkdir(parents=True, exist_ok=True)
            destination_path = destination_dir / stored_name

            if source_path.exists() and source_path.is_file():
                import shutil
                shutil.copy2(source_path, destination_path)
                saved_path = f"uploads/{stored_name}".replace("\\", "/")
            else:
                saved_path = f"uploads/{stored_name}".replace("\\", "/")

        if not url.lower().startswith(("http://", "https://")) and not os.path.exists(url):
            saved_path = f"uploads/{file_id}_{self._validate_upload_filename(original_filename)}".replace("\\", "/")

        if not original_filename or "." not in original_filename:
            original_filename = "document.pdf"

        safe_file_name = self._validate_upload_filename(original_filename)

        db_id = self.repo.create_document(
            file_id=file_id,
            file_name=safe_file_name,
            original_file_name=original_source_name or safe_file_name,
            file_path=saved_path,
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

        raw_file_path = document["file_path"]
        file_path = raw_file_path

        if file_path.startswith("http://") or file_path.startswith("https://"):
            import urllib.parse
            parsed_url = urllib.parse.urlparse(file_path)
            query_params = urllib.parse.parse_qs(parsed_url.query)

            if "path" in query_params and query_params["path"]:
                raw_target = query_params["path"][0]
                target_local_path = os.path.abspath(raw_target.replace("/", os.sep).replace("\\", os.sep))
                if os.path.exists(target_local_path):
                    file_path = target_local_path

            if file_path.startswith("http://") or file_path.startswith("https://"):
                import requests

                try:
                    logger.info("Downloading file from URL: %s", file_path)
                    response = requests.get(file_path, timeout=60)
                    response.raise_for_status()

                    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
                    stored_filename = f"{document['document_id']}_{self._validate_upload_filename(document['document_name'])}"
                    full_disk_path = os.path.join(settings.UPLOAD_FOLDER, stored_filename)

                    with open(full_disk_path, "wb") as buffer:
                        buffer.write(response.content)

                    file_path = full_disk_path
                    logger.info("Downloaded URL content successfully to %s", full_disk_path)
                except Exception as dl_err:
                    logger.exception("Failed to download file from URL %s: %s", file_path, dl_err)
                    self.repo.update_status(document_id, "FAILED", f"File download failed: {dl_err}")
                    raise

        # Ensure file sits in uploads/ and document_extraction file_path is saved as relative uploads/ path
        norm_file_path = os.path.abspath(file_path.replace("/", os.sep).replace("\\", os.sep)) if not (file_path.startswith("http://") or file_path.startswith("https://")) else None
        if norm_file_path and os.path.exists(norm_file_path):
            upload_dir_abs = os.path.abspath(settings.UPLOAD_FOLDER)
            stored_name = f"{document['document_id']}_{self._validate_upload_filename(document['document_name'])}"
            upload_path_abs = os.path.abspath(os.path.join(upload_dir_abs, stored_name))

            if norm_file_path != upload_path_abs:
                os.makedirs(upload_dir_abs, exist_ok=True)
                import shutil
                shutil.copy2(norm_file_path, upload_path_abs)

            rel_saved_path = f"uploads/{stored_name}".replace("\\", "/")
            cursor = self.db.cursor()
            cursor.execute(
                "UPDATE document_extraction SET file_path = %s WHERE id = %s",
                (rel_saved_path, document_id),
            )
            self.db.commit()
            document["file_path"] = rel_saved_path
            file_path = upload_path_abs

        extractor = ExtractorRegistry.get_extractor(document["document_type"])

        ocr_text = ""
        result = {}

        ext = os.path.splitext(file_path)[1].lower()
        is_text_document = ext in self.TEXT_UPLOAD_EXTENSIONS

        # If we have already extracted an identical file with the same prompt
        # version, reuse that result instead of paying for OCR + LLM again.
        content_hash = self._hash_file(file_path)
        prompt_hash = self._current_prompt_hash(document["document_type"])
        self.repo.record_document_hashes(document_id, content_hash, prompt_hash)

        reused = self.repo.find_reusable_extraction(
            content_hash, prompt_hash, exclude_id=document_id
        )
        if reused and reused.get("extracted_json"):
            logger.info(
                "Reusing prior extraction for document %s (identical content, prompt unchanged).",
                document_id,
            )
            ocr_text = reused.get("ocr_text") or ""
            result = reused.get("extracted_json") or {}
        elif is_text_document:
            logger.info("Extracting text from %s document (no OCR)...", ext)
            try:
                if ext == ".docx":
                    ocr_text = self._extract_text_from_docx(file_path)
                else:
                    ocr_text = self._extract_text_from_textfile(file_path)
                ocr_text = extractor.pre_process(ocr_text)

                result = self._run_extraction(document["document_type"], ocr_text)
            except Exception as text_err:
                logger.exception("Text-document extraction failed: %s", text_err)
                self.repo.update_status(document_id, "FAILED", str(text_err))
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

        # Rebuild the extracted dict in the canonical key order from the YAML
        # schema (which mirrors the prompt template) so what we persist and
        # return matches that structure instead of Gemini's arbitrary ordering.
        result = self._order_result_to_schema(document["document_type"], result)

        self.repo.save_result(
            document_id=document_id,
            extracted_json=result,
            ocr_text=ocr_text,
        )

        try:
            self._populate_business_tables(document, result)
        except VendorNotInListError as vendor_err:
            # The vendor is normally gated before upload; if we still get here
            # (e.g. an email-ingested invoice whose extracted vendor is not
            # registered) fail the document with the same message instead of
            # parking it in a resumable state.
            logger.warning(
                "Vendor not in list for document %s: %s", document_id, vendor_err
            )
            self.repo.update_status(document_id, "FAILED", str(vendor_err))
            return result
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

    def _order_result_to_schema(self, document_type: str, result: dict) -> dict:
        """Return ``result`` with its keys reordered to the YAML schema's
        canonical structure. Never raises - falls back to the result as-is."""
        try:
            schema_fields = self.prompt_manager.get_schema(document_type=document_type)
            return order_result_to_schema(result, schema_fields)
        except Exception:
            logger.exception(
                "Could not reorder extraction result for document_type=%s; "
                "returning it in the model's original order.",
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
            bank_info = data.get("Bank_Information", {})
            txs = data.get("Transactions", [])

            bank_name = (
                bank_info.get("Bank_Name")
                or bank_info.get("bank_name")
                or acc.get("Bank_Name")
                or acc.get("bank_name")
            )
            account_number = (
                acc.get("Account_Number")
                or acc.get("account_number")
            )
            account_holder = (
                acc.get("Account_Holder")
                or acc.get("account_holder")
            )
            statement_type = (
                acc.get("Statement_Type")
                or acc.get("statement_type")
            )

            period_str = acc.get("Statement_Period", "")
            month, year = self._parse_period(period_str, txs)
            tx_count = len(txs)
            
            # Extract association_id and bank_account_id if available
            association_id = acc.get("Association_ID") or acc.get("association_id")
            bank_account_id = acc.get("Bank_Account_ID") or acc.get("bank_account_id")
            
            # Convert association_id and bank_account_id to int if they exist
            if association_id:
                try:
                    association_id = int(association_id)
                except (ValueError, TypeError):
                    association_id = None
            if not association_id:
                association_id = self.repo.get_first_association_id()
            if bank_account_id:
                try:
                    bank_account_id = int(bank_account_id)
                except (ValueError, TypeError):
                    bank_account_id = None
            if bank_account_id and not self.repo.bank_account_exists(bank_account_id):
                logger.warning(
                    "Extracted bank_account_id=%s does not exist; resolving from bank statement details instead.",
                    bank_account_id,
                )
                bank_account_id = None

            if not bank_account_id:
                bank_account_id = self.repo.get_or_create_bank_account(
                    association_id=association_id,
                    bank_name=bank_name,
                    account_number=account_number,
                    account_holder=account_holder,
                    statement_type=statement_type,
                    created_by=document.get("uploaded_by"),
                )
             
            # Format statement_period as YYYY-MM-DD
            statement_period = None
            if period_str:
                try:
                    from datetime import datetime
                    # Try to parse the period string and format as date
                    parsed_date = self._parse_date(period_str.split("-")[0].strip() if "-" in period_str else period_str, statement_year=year)
                    statement_period = parsed_date
                except Exception:
                    pass

            stmt_id = self.repo.create_bank_statement_record(
                file_name=document["document_name"],
                period_month=month,
                period_year=year,
                transaction_count=tx_count,
                file_path=file_path,
                association_id=association_id,
                document_extraction_id=document.get("id"),
                bank_account_id=bank_account_id,
                statement_period=statement_period,
                notes=None,
                uploaded_by=document.get("uploaded_by"),
            )

            mapped_txs = []

            for tx in txs:
                tx_date = self._parse_date(tx.get("Date"), statement_year=year)
                withdrawal = self._to_float(tx.get("Withdrawal"))
                deposit = self._to_float(tx.get("Deposit"))

                amount = 0.0
                direction = "Credit"
                if deposit > 0:
                    amount = deposit
                    direction = "Credit"
                elif withdrawal > 0:
                    amount = withdrawal
                    direction = "Debit"
                else:
                    val = tx.get("Amount")
                    if val is not None:
                        amount = abs(self._to_float(val))
                        direction = "Credit" if self._to_float(val) >= 0 else "Debit"

                cheque_number = tx.get("Cheque_Number") or tx.get("Check_Number")
                description = tx.get("Description", "No Description")
                method = self._resolve_transaction_method(direction, description, cheque_number)

                mapped_txs.append(
                    {
                        "transaction_date": tx_date,
                        "description": description,
                        "amount": amount,
                        "transaction_type": direction,
                        "transaction_method": method,
                        "reference": tx.get("Reference") or cheque_number,
                    }
                )

            self.repo.create_bank_transaction_records(
                stmt_id, 
                mapped_txs,
                document_extraction_id=document.get("id")
            )
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
            account_info = invoice_data.get("Account_Information", {})
            summary = invoice_data.get("Invoice_Summary", {})

            extracted_vendor_name = (v_info.get("Vendor_Name") or "").strip()
            vendor_name = (
                document.get("vendor_name") or extracted_vendor_name or "Unknown Vendor"
            )
            created_by = document.get("uploaded_by")

            association_id = inv_info.get("Association_ID") or inv_info.get("association_id")
            if association_id:
                try:
                    association_id = int(association_id)
                except (ValueError, TypeError):
                    association_id = None
            if not association_id:
                association_id = self.repo.get_first_association_id()

            vendor_id = document.get("vendor_id")
            if not vendor_id and extracted_vendor_name:
                match = self.repo.find_vendor_by_name(extracted_vendor_name, association_id=association_id)
                if match:
                    vendor_id = match["id"]
            if not vendor_id:
                vendor_id = self.repo.get_or_create_vendor(
                    vendor_name or extracted_vendor_name or "Unknown Vendor",
                    association_id=association_id
                )

            inv_number = inv_info.get("Invoice_Number")
            if not inv_number:
                inv_number = f"INV-{document['document_id'][:8]}"

            inv_date = self._parse_date(
                inv_info.get("Invoice_Date") or account_info.get("Statement_Date")
            )
            due_date = self._derive_due_date(
                inv_info.get("Due_Date") or account_info.get("Due_Date"),
                inv_date,
                inv_info.get("Terms"),
            )
            today_str = date.today().strftime("%Y-%m-%d")
            if not inv_date:
                inv_date = today_str
            if not due_date:
                due_date = inv_date

            amount = self._resolve_invoice_amount(summary)
            if amount == 0.0:
                amount = self._resolve_invoice_amount(invoice_data.get("Statement_Summary", {}))
            if amount == 0.0:
                amount = self._sum_invoice_items(invoice_data.get("Invoice_Items") or [])

            gmail_import_id = None
            if str(document.get("source") or "").upper() == "EMAIL":
                gmail_import_id = self.repo.get_gmail_import_log_id(
                    association_id=association_id,
                    file_path=document.get("file_path"),
                    original_file_name=document.get("original_file_name") or document.get("document_name"),
                )

            self.repo.create_invoice_record(
                vendor_id=vendor_id,
                invoice_number=inv_number,
                amount=amount,
                invoice_date=inv_date,
                due_date=due_date,
                file_path=file_path,
                document_db_id=document["id"],
                association_id=association_id,
                created_by=created_by,
                source="Gmail_Import" if str(document.get("source") or "").upper() == "EMAIL" else "Manual",
                gmail_import_id=gmail_import_id,
            )
            logger.info("Successfully populated invoice for %s", db_uuid)

            # Auto-populate payables table when an invoice is extracted
            try:
                payable_service = PayableService(self.db)
                payable_service.create_payable_from_extraction(
                    association_id=association_id,
                    vendor_id=vendor_id,
                    document_extraction_id=document.get("id"),
                    pay_to=vendor_name,
                    date_of_payment=inv_date or date.today().strftime("%Y-%m-%d"),
                    amount=amount,
                    due_date=due_date or inv_date or date.today().strftime("%Y-%m-%d"),
                    invoice_reference_number=inv_number,
                    created_by=created_by,
                )
                logger.info("Successfully auto-populated payable for %s", db_uuid)
            except Exception as payable_err:
                logger.exception("Failed to auto-populate payable for %s: %s", db_uuid, payable_err)

    @staticmethod
    def _hash_file(file_path: str) -> Optional[str]:
        try:
            digest = hashlib.sha256()
            with open(file_path, "rb") as handle:
                for chunk in iter(lambda: handle.read(8192), b""):
                    digest.update(chunk)
            return digest.hexdigest()
        except OSError:
            return None

    def _current_prompt_hash(self, document_type: str) -> Optional[str]:
        try:
            prompt_template = self.prompt_manager.get_prompt(document_type=document_type)
            return hashlib.sha256(prompt_template.encode("utf-8")).hexdigest()
        except Exception:
            logger.debug("Could not compute prompt hash for %s", document_type, exc_info=True)
            return None

    def _extract_text_from_textfile(self, file_path: str) -> str:
        """Read a .csv / .txt invoice as plain text for the LLM (no OCR).

        CSV rows are flattened to ' | '-joined lines so column structure stays
        legible to the model.
        """
        ext = os.path.splitext(file_path)[1].lower()
        with open(file_path, "r", encoding="utf-8-sig", errors="replace") as handle:
            raw = handle.read()

        if ext != ".csv":
            return raw

        rows = []
        for row in csv.reader(io.StringIO(raw)):
            cells = [cell.strip() for cell in row]
            if any(cells):
                rows.append(" | ".join(cells))
        return "\n".join(rows) if rows else raw

    def _derive_due_date(self, printed_due_date, invoice_date, terms) -> Optional[str]:
        """Resolve the invoice due date.

        Priority: an actual printed due date -> derived from payment terms
        (``Net 30`` / ``30 days``) relative to the invoice date -> ``None``.
        We no longer fall back to "today" so the invoices table can hold a real
        NULL when the due date is genuinely unknown.
        """
        raw = str(printed_due_date or "").strip()
        if raw and any(char.isdigit() for char in raw):
            parsed = self._parse_date(raw)
            if parsed:
                return parsed

        terms_str = str(terms or "").strip().lower()
        net_days = None
        if terms_str:
            match = re.search(r"net\s*(\d{1,3})", terms_str) or re.search(
                r"(\d{1,3})\s*day", terms_str
            )
            if match:
                net_days = int(match.group(1))

        if net_days is not None and invoice_date:
            try:
                base = datetime.strptime(str(invoice_date), "%Y-%m-%d").date()
                return (base + timedelta(days=net_days)).strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                return None

        return None

    @staticmethod
    def _resolve_transaction_method(direction: str, description, cheque_number) -> str:
        """Classify HOW a bank transaction moved, independent of its Credit/Debit
        direction. Values match bank_transactions.transaction_method:
        Cheque / ACH / Deposit / Debit / Other."""
        if cheque_number and str(cheque_number).strip():
            return "Cheque"

        desc = str(description or "").lower()
        if re.search(r"\bach\b", desc) or "electronic" in desc or "e-transfer" in desc:
            return "ACH"
        if re.search(r"\b(che(ck|que)|ck#|chk)\b", desc):
            return "Cheque"

        return "Deposit" if direction == "Credit" else "Debit"

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

    def _resolve_invoice_amount(self, summary: dict) -> float:
        if not isinstance(summary, dict):
            return 0.0
        for key in ("Total_Due", "Total_Amount_Due", "Amount_Due", "Grand_Total", "Total"):
            amount = self._to_float(summary.get(key))
            if amount > 0:
                return amount
        for key in ("Subtotal", "Total_Amount", "Balance_Due"):
            amount = self._to_float(summary.get(key))
            if amount > 0:
                return amount
        return 0.0

    def _sum_invoice_items(self, items: list) -> float:
        if not isinstance(items, list):
            return 0.0
        total = 0.0
        for item in items:
            if not isinstance(item, dict):
                continue
            total += self._to_float(item.get("Amount"))
        return round(total, 2)

    def _parse_date(self, value, statement_year: Optional[int] = None) -> str:
        import datetime
        import re

        if not value:
            return datetime.date.today().strftime("%Y-%m-%d")

        val_str = str(value).strip()
        
        # Append statement year if input is standard MM/DD or DD/MM format (e.g. 06/02 or 6-2)
        year_to_use = statement_year or datetime.date.today().year
        if re.match(r"^\d{1,2}/\d{1,2}$", val_str):
            val_str = f"{val_str}/{year_to_use}"
        elif re.match(r"^\d{1,2}-\d{1,2}$", val_str):
            val_str = f"{val_str}-{year_to_use}"

        for fmt in (
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%m-%d-%Y",
            "%d-%m-%Y",
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
            # Parse MM/DD/YY or MM/DD/YYYY range, e.g. "06/01/26-06/30/26" or "06/01/2026"
            date_matches = re.findall(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b", period_str)
            if date_matches:
                m_str, d_str, y_str = date_matches[0]
                month = int(m_str)
                y_val = int(y_str)
                year = 2000 + y_val if y_val < 100 else y_val
                return month, year

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
            first_tx_date = self._parse_date(txs[0].get("Date"), statement_year=year)
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
        # Keep the edited result in the same canonical structure as a fresh
        # extraction.
        doc = self.repo.get_document(db_id)
        if doc and isinstance(payload, dict):
            payload = self._order_result_to_schema(doc["document_type"], payload)
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
        date_part = date.today().strftime("%Y%m%d")

        for _ in range(10):
            random_part = uuid.uuid4().hex[:6].upper()
            document_id = f"{prefix}-{date_part}-{random_part}"
            if not self.repo.document_id_exists(document_id):
                return document_id

        raise ValueError("Unable to generate a unique document_id. Please try again.")

    def _find_unit_from_description(self, description: str, units: list) -> Optional[dict]:
        """Extract unit number from transaction description and find matching condo unit."""
        if not description:
            return None

        desc_lower = description.lower()
        import re

        # Try to extract unit number: "Unit 101", "Unit-101", "unit101"
        match = re.search(r'unit[\s\-]?(\d+)', desc_lower)
        if match:
            unit_number = match.group(1)
            for unit in units:
                if str(unit["unit_number"]) == unit_number:
                    return unit

        # Try direct unit number match in the text (e.g. description has '101')
        for unit in units:
            # Match unit number surrounded by word boundaries to avoid matching 10 in 101
            pattern = r'\b' + re.escape(str(unit["unit_number"])) + r'\b'
            if re.search(pattern, desc_lower):
                return unit

        # Try owner name match
        for unit in units:
            owner_lower = unit["owner_name"].lower()
            name_parts = owner_lower.split()
            for part in name_parts:
                if len(part) > 2 and part in desc_lower:
                    return unit

        return None
