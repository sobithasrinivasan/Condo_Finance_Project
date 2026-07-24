from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
    Body,
    BackgroundTasks
)
from typing import List, Optional
import logging
from pathlib import Path
from pydantic import BaseModel

from app.core.database import get_db_connection
from app.modules.extraction.service import ExtractionService, is_trusted_local_email_path

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/extraction",
    tags=["Extraction"]
)


class EmailDocumentItem(BaseModel):
    doc_type: str
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    document: str


class EmailUploadRequest(BaseModel):
    documents: List[EmailDocumentItem]


def run_background_extraction(db_id: int):
    db = get_db_connection()
    try:
        service = ExtractionService(db)
        service.process_document(db_id)
    except Exception as e:
        logger.exception(f"Background extraction failed for document row ID {db_id}: {e}")
    finally:
        db.close()


@router.post("/upload")
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    doc_types: List[str] = Form(...),
    vendor_ids: List[str] = Form(default=[]),
    vendor_names: List[str] = Form(default=[]),
    document_ids: List[str] = Form(default=[]),
    source: str = Form(default="UPLOAD")
):
    db = get_db_connection()

    try:
        service = ExtractionService(db)
        
        # Ensure form inputs are parsed correctly (handles case when list is sent as a comma-separated string)
        def parse_input_list(lst: List[str]) -> List[str]:
            res = []
            for val in lst:
                if "," in val:
                    res.extend([x.strip() for x in val.split(",")])
                else:
                    res.append(val.strip())
            return res

        parsed_doc_types = parse_input_list(doc_types)
        parsed_vendor_ids = parse_input_list(vendor_ids)
        parsed_vendor_names = parse_input_list(vendor_names)
        parsed_document_ids = parse_input_list(document_ids)

        results = []

        for i, file in enumerate(files):
            # Resolve corresponding metadata fields (fallback to single value if only 1 is passed)
            doc_type = parsed_doc_types[i] if i < len(parsed_doc_types) else (parsed_doc_types[0] if parsed_doc_types else "INVOICE")
            
            vendor_id_str = parsed_vendor_ids[i] if i < len(parsed_vendor_ids) else (parsed_vendor_ids[0] if parsed_vendor_ids else None)
            vendor_id = None
            if vendor_id_str and vendor_id_str not in ("", "null", "None"):
                try:
                    vendor_id = int(vendor_id_str)
                except ValueError:
                    pass

            vendor_name = parsed_vendor_names[i] if i < len(parsed_vendor_names) else (parsed_vendor_names[0] if parsed_vendor_names else None)
            if vendor_name and vendor_name in ("", "null", "None"):
                vendor_name = None

            document_id = parsed_document_ids[i] if i < len(parsed_document_ids) else (parsed_document_ids[0] if parsed_document_ids else None)
            if document_id and document_id in ("", "null", "None"):
                document_id = None

            # Create document extraction record (status: PROCESSING)
            res = await service.upload_document(
                file=file,
                document_type=doc_type,
                source=source,
                vendor_id=vendor_id,
                vendor_name=vendor_name,
                document_id=document_id
            )
            
            # Queue the background processing job
            background_tasks.add_task(run_background_extraction, res["db_id"])
            
            results.append({
                "document_id": res["document_id"],
                "status": "PROCESSING"
            })

        return results
    finally:
        db.close()


@router.post("/email-upload")
async def email_upload_documents(
    background_tasks: BackgroundTasks,
    payload: EmailUploadRequest = Body(...)
):
    db = get_db_connection()

    try:
        service = ExtractionService(db)
        results = []

        for item in payload.documents:
            document_ref = item.document

            # `document` may be either a real remote URL (downloaded in the
            # background below) or a local path already sitting inside a
            # trusted, pre-configured ingestion folder (EMAIL_INGESTION_ALLOWED_ROOTS)
            # - e.g. an email-ingestion tool that already saved the attachment
            # to disk. Anything else is rejected: without this check, a caller
            # could pass an arbitrary local path and have the OCR step read it
            # straight off the server's disk (see OCRService._validate_file).
            is_remote_url = document_ref.lower().startswith(("http://", "https://"))
            is_trusted_local = (not is_remote_url) and is_trusted_local_email_path(document_ref)

            if not (is_remote_url or is_trusted_local):
                results.append({
                    "document": document_ref,
                    "status": "REJECTED",
                    "error": "document must be an http:// or https:// URL, or a local path "
                             "inside a configured EMAIL_INGESTION_ALLOWED_ROOTS folder. "
                             "For one-off local files, use POST /upload instead."
                })
                continue

            if is_trusted_local:
                document_ref = str(Path(document_ref).resolve())

            res = service.upload_link_document(
                url=document_ref,
                document_type=item.doc_type,
                source="EMAIL",
                vendor_id=item.vendor_id,
                vendor_name=item.vendor_name,
                document_id=None
            )

            # Queue the background processing job (downloads and extracts in background)
            background_tasks.add_task(run_background_extraction, res["db_id"])

            results.append({
                "document_id": res["document_id"],
                "status": "PROCESSING"
            })

        return results
    finally:
        db.close()


@router.get("/")
def get_documents(
    document_id: Optional[str] = None,
    vendor_name: Optional[str] = None,
    doc_type: Optional[str] = None,
    status: Optional[str] = None,
    uploaded_from: Optional[str] = None,
    uploaded_to: Optional[str] = None
):
    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_documents(
            document_id=document_id,
            vendor_name=vendor_name,
            doc_type=doc_type,
            status=status,
            uploaded_from=uploaded_from,
            uploaded_to=uploaded_to
        )
    finally:
        db.close()


@router.get("/{document_id}")
def get_document(document_id: str):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_document(document_id)
    finally:
        db.close()


@router.get("/{document_id}/status")
def get_document_status(document_id: str):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_document_status(document_id)
    finally:
        db.close()


@router.get("/{document_id}/result")
def get_extraction_result(document_id: str):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_extraction_result(document_id)
    finally:
        db.close()


@router.put("/{document_id}")
def update_extraction_result(
    document_id: str,
    payload: dict = Body(...)
):

    db = get_db_connection()

    try:
        service = ExtractionService(db)

        return service.update_document(
            document_id=document_id,
            payload=payload
        )
    finally:
        db.close()


@router.delete("/{document_id}")
def delete_document(document_id: str):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.delete_document(document_id)
    finally:
        db.close()