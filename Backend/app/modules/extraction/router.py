import json
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, Body, HTTPException, Request, status
import logging
from pydantic import BaseModel
from starlette.datastructures import UploadFile

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


def _parse_text_list(form: Any, *keys: str) -> List[str]:
    for key in keys:
        parsed: List[str] = []
        for raw_value in form.getlist(key):
            if raw_value is None or isinstance(raw_value, UploadFile):
                continue

            value = str(raw_value).strip()
            if not value:
                continue

            if value.startswith("[") and value.endswith("]"):
                try:
                    json_value = json.loads(value)
                except json.JSONDecodeError:
                    json_value = None

                if isinstance(json_value, list):
                    parsed.extend(
                        str(item).strip()
                        for item in json_value
                        if item is not None and str(item).strip()
                    )
                    continue

            if "," in value:
                parsed.extend(part.strip() for part in value.split(",") if part.strip())
            else:
                parsed.append(value)

        if parsed:
            return parsed

    return []


def _parse_upload_files(form: Any, *keys: str) -> List[UploadFile]:
    for key in keys:
        files = [item for item in form.getlist(key) if isinstance(item, UploadFile)]
        if files:
            return files
    return []


def _validate_metadata_count(field_name: str, values: List[str], file_count: int) -> None:
    if values and len(values) not in (1, file_count):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"'{field_name}' must be provided once or once per file.",
        )


def _resolve_metadata_value(values: List[str], index: int) -> Optional[str]:
    if not values:
        return None
    if len(values) == 1:
        return values[0]
    return values[index]


def _parse_vendor_id(raw_vendor_id: Optional[str]) -> Optional[int]:
    if raw_vendor_id is None:
        return None

    cleaned_vendor_id = raw_vendor_id.strip()
    if cleaned_vendor_id in ("", "null", "None"):
        return None

    try:
        return int(cleaned_vendor_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid vendor_id '{raw_vendor_id}'. vendor_id must be an integer.",
        ) from exc


def run_background_extraction(db_id: int):
    db = get_db_connection()
    try:
        service = ExtractionService(db)
        service.process_document(db_id)
    except Exception as e:
        logger.exception(f"Background extraction failed for document row ID {db_id}: {e}")
    finally:
        db.close()


@router.post(
    "/upload",
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "required": ["files", "document_type"],
                        "type": "object",
                        "properties": {
                            "files": {
                                "title": "Files",
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "format": "binary"
                                },
                                "description": "One or more document files to upload (PDF, PNG, JPG, etc.)"
                            },
                            "document_type": {
                                "title": "Document Type",
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Document type for each file (e.g. INVOICE, BANK_STATEMENT). Pass one value to apply it to all files."
                            },
                            "vendor_name": {
                                "title": "Vendor Name",
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional vendor name for each file."
                            },
                            "vendor_id": {
                                "title": "Vendor Id",
                                "type": "array",
                                "items": {"type": "integer"},
                                "description": "Optional vendor ID for each file."
                            }
                        }
                    }
                }
            }
        }
    }
)
async def upload_documents(
    background_tasks: BackgroundTasks,
    request: Request,
):
    db = get_db_connection()

    try:
        service = ExtractionService(db)
        form = await request.form()

        files = _parse_upload_files(form, "files", "file")
        if not files:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one file must be uploaded using the 'files' field.",
            )

        parsed_doc_types = _parse_text_list(form, "document_type", "document_types", "doc_type", "doc_types")
        parsed_vendor_names = _parse_text_list(form, "vendor_name", "vendor_names", "name", "names")
        parsed_vendor_ids = _parse_text_list(form, "vendor_id", "vendor_ids")

        if not parsed_doc_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="'document_type' is mandatory.",
            )

        _validate_metadata_count("document_type", parsed_doc_types, len(files))
        _validate_metadata_count("vendor_name", parsed_vendor_names, len(files))
        _validate_metadata_count("vendor_id", parsed_vendor_ids, len(files))

        results = []

        for i, file in enumerate(files):
            doc_type = _resolve_metadata_value(parsed_doc_types, i)
            vendor_name = _resolve_metadata_value(parsed_vendor_names, i)
            vendor_id = _parse_vendor_id(_resolve_metadata_value(parsed_vendor_ids, i))

            try:
                res = await service.upload_document(
                    file=file,
                    document_type=doc_type or "",
                    source="UPLOAD",
                    vendor_id=vendor_id,
                    vendor_name=vendor_name,
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(exc),
                ) from exc

            background_tasks.add_task(run_background_extraction, res["db_id"])

            results.append({
                "document_id": res["document_id"],
                "document_name": Path(file.filename or "").name,
                "document_type": res["document_type"],
                "source": res["source"],
                "status": res["status"],
                "message": "Document uploaded successfully. OCR extraction queued.",
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

            try:
                res = service.upload_link_document(
                    url=document_ref,
                    document_type=item.doc_type,
                    source="EMAIL",
                    vendor_id=item.vendor_id,
                    vendor_name=item.vendor_name,
                )
            except ValueError as exc:
                results.append({
                    "document": document_ref,
                    "status": "REJECTED",
                    "error": str(exc),
                })
                continue

            # Queue the background processing job (downloads and extracts in background)
            background_tasks.add_task(run_background_extraction, res["db_id"])

            results.append({
                "document_id": res["document_id"],
                "document_type": res["document_type"],
                "source": res["source"],
                "status": res["status"],
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
