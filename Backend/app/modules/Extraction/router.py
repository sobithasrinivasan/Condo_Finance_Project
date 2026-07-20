from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
    Body
)

from app.core.database import get_db_connection
from app.modules.extraction.service import ExtractionService


router = APIRouter(
    prefix="/extraction",
    tags=["Extraction"]
)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    source: str = Form(default="UPLOAD")
):
    db = get_db_connection()

    try:
        service = ExtractionService(db)

        return await service.upload_document(
            file=file,
            document_type=document_type,
            source=source
        )
    finally:
        db.close()


@router.get("/")
def get_documents():

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_documents()
    finally:
        db.close()


@router.get("/{document_id}")
def get_document(document_id: int):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_document(document_id)
    finally:
        db.close()


@router.get("/{document_id}/status")
def get_document_status(document_id: int):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_document_status(document_id)
    finally:
        db.close()


@router.get("/{document_id}/result")
def get_extraction_result(document_id: int):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.get_extraction_result(document_id)
    finally:
        db.close()


@router.put("/{document_id}")
def update_extraction_result(
    document_id: int,
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
def delete_document(document_id: int):

    db = get_db_connection()

    try:
        service = ExtractionService(db)
        return service.delete_document(document_id)
    finally:
        db.close()