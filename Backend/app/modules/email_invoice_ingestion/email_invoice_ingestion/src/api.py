import os
import sys
import logging
from urllib.parse import quote
from datetime import date
sys.path.insert(0, os.path.dirname(__file__))
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db_connection
from gmail_client import GmailClient
from attachment_extractor import AttachmentExtractor
from utils import load_config, setup_logging, ProcessedIdStore
from main import run_once as _run_once_poll
import json
logger = logging.getLogger(__name__)
SUPPORTED_DOC_TYPES = {
    'pest_services',
    'property_management',
    'telephone_provider',
    'electric_and_gas_company'
}
def _category_to_doc_type(category: Optional[str]) -> Optional[str]:
    if not category:
        return None
    slug = category.strip().lower().replace(' ', '_').replace('&', 'and').replace('__', '_')
    return slug if slug in SUPPORTED_DOC_TYPES else None
_default_association_id_cache = None
def _get_default_association_id() -> Optional[int]:
    global _default_association_id_cache
    if _default_association_id_cache is not None:
        return _default_association_id_cache
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM condo_associations WHERE status = 'Active' ORDER BY id LIMIT 1")
        row = cursor.fetchone()
        if row:
            _default_association_id_cache = row['id']
        return _default_association_id_cache
    finally:
        conn.close()
def _extract_pdf_text(file_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        return ''.join((page.extract_text() or '') for page in reader.pages[:1])
    except Exception as e:
        logger.warning(f'Could not extract text from {file_path}: {e}')
        return ''
def _lookup_vendor_id_from_document(file_path: str):
    if not file_path or not os.path.exists(file_path):
        return None
    text = _extract_pdf_text(file_path).lower()
    if not text:
        return None
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id, vendor_name FROM vendors')
        for v in cursor.fetchall():
            if v['vendor_name'].lower() in text:
                return v['id']
        return None
    finally:
        conn.close()
def _lookup_vendor_id(vendor_name_raw: str, sender_email: str = ''):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        if '@' in sender_email:
            domain = sender_email.split('@')[-1].lower()
            cursor.execute("SELECT id FROM vendors WHERE LOWER(SUBSTRING_INDEX(email, '@', -1)) = %s", (domain,))
            row = cursor.fetchone()
            if row:
                return row['id']
        if not vendor_name_raw:
            return None
        cursor.execute('SELECT id FROM vendors WHERE vendor_name = %s', (vendor_name_raw,))
        row = cursor.fetchone()
        if row:
            return row['id']
        cursor.execute(
            "SELECT id FROM vendors WHERE %s LIKE CONCAT('%%', vendor_name, '%%') OR vendor_name LIKE CONCAT('%%', %s, '%%') LIMIT 1",
            (vendor_name_raw, vendor_name_raw)
        )
        row = cursor.fetchone()
        return row['id'] if row else None
    finally:
        conn.close()
def _vendor_name_by_id(vendor_id):
    if vendor_id is None:
        return None
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT vendor_name FROM vendors WHERE id = %s', (vendor_id,))
        row = cursor.fetchone()
        return row['vendor_name'] if row else None
    finally:
        conn.close()
def _record_gmail_import(record: dict, file_path: str = None, status: str = 'Imported', error_message: str = None):
    association_id = _get_default_association_id()
    if association_id is None:
        logger.error('No active condo_associations found — skipping gmail_import_logs insert.')
        return
    vendor_id = _lookup_vendor_id_from_document(file_path)
    if vendor_id is None:
        vendor_id = _lookup_vendor_id(record['vendor_name_raw'], record.get('sender_email', ''))
    vendor_name = _vendor_name_by_id(vendor_id) or record['vendor_name_raw']
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO gmail_import_logs
                (association_id, gmail_message_id, from_email, vendor_id, vendor_name,
                 subject, received_date, doc_url, status, error_message,
                 created_by, updated_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL)
            ''',
            (association_id, record['message_id'], record.get('sender_email', ''), vendor_id, vendor_name,
             record['subject'], record['received_date'], file_path, status, error_message)
        )
        conn.commit()
        logger.info(f"[{record['message_id']}] Recorded in gmail_import_logs with status '{status}'.")
    except Exception as e:
        conn.rollback()
        logger.error(f"[{record['message_id']}] Failed to record gmail_import_logs row: {e}")
    finally:
        conn.close()
router = APIRouter(prefix='/gmail-invoices', tags=['Email Invoice Ingestion'])
_MODULE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIG_PATH = os.path.join(_MODULE_DIR, 'config', 'config.yaml')
_CREDENTIALS_DIR = os.path.join(_MODULE_DIR, 'credentials')
_cfg = _gmail = _extractor = _store = None
def get_context():
    global _cfg, _gmail, _extractor, _store
    if _gmail is None:
        cfg = load_config(_CONFIG_PATH)
        cfg['storage']['base_dir'] = os.path.join(_MODULE_DIR, cfg['storage']['base_dir'])
        cfg['storage']['quarantine_dir'] = os.path.join(_MODULE_DIR, cfg['storage']['quarantine_dir'])
        cfg['state']['processed_ids_file'] = os.path.join(_MODULE_DIR, cfg['state']['processed_ids_file'])
        cfg['logging']['log_dir'] = os.path.join(_MODULE_DIR, cfg['logging']['log_dir'])
        setup_logging(cfg)
        _cfg = cfg
        _gmail = GmailClient(credentials_dir=_CREDENTIALS_DIR)
        _extractor = AttachmentExtractor(_gmail, _cfg)
        _store = ProcessedIdStore(_cfg['state']['processed_ids_file'])
    return (_cfg, _gmail, _extractor, _store)
def _download_url(request: Request, file_path: str) -> str:
    return f"{request.url_for('download_invoice')}?path={quote(file_path)}"
class InvoiceFile(BaseModel):
    path: str
    size_bytes: int
    url: str
class PollResult(BaseModel):
    query: str
    messages_found: int
    new_processed: int
    files: List[InvoiceFile]
class GmailInvoiceFile(BaseModel):
    doc_type: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: str
    from_email: Optional[str] = None
    document: str
    received_date: Optional[date] = None
@router.post('/gmail/poll', response_model=PollResult)
def poll_mailbox(request: Request):
    cfg, gmail, extractor, store = get_context()
    query = cfg['gmail']['query']
    before_count = len(store._ids)
    try:
        saved_files, message_records = _run_once_poll(gmail, extractor, cfg, store)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    for record in message_records:
        if record['saved_files']:
            for fp in record['saved_files']:
                _record_gmail_import(record, file_path=fp, status='Imported')
        else:
            _record_gmail_import(record, file_path=None, status='Failed', error_message='No valid invoice attachments found.')
    files = [
        InvoiceFile(path=fp, size_bytes=os.path.getsize(fp) if os.path.exists(fp) else 0, url=_download_url(request, fp))
        for fp in saved_files or []
    ]
    messages = gmail.list_messages(query=query, max_results=cfg['polling']['max_results_per_poll'])
    return PollResult(query=query, messages_found=len(messages), new_processed=len(store._ids) - before_count, files=files)
@router.get('/invoices', response_model=List[InvoiceFile])
def list_invoices(request: Request):
    cfg, _, _, _ = get_context()
    base_dir = cfg['storage']['base_dir']
    files = []
    if os.path.exists(base_dir):
        for root, _, filenames in os.walk(base_dir):
            for fn in filenames:
                full_path = os.path.join(root, fn)
                files.append(InvoiceFile(path=full_path, size_bytes=os.path.getsize(full_path), url=_download_url(request, full_path)))
    return files
@router.get('/invoices/gmail', response_model=List[GmailInvoiceFile])
def list_gmail_invoices(request: Request):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT g.vendor_id, COALESCE(v.vendor_name, g.vendor_name) AS vendor_name,
                   v.category, g.doc_url, g.received_date, g.from_email
            FROM gmail_import_logs g
            LEFT JOIN vendors v ON v.id = g.vendor_id
            WHERE g.doc_url IS NOT NULL
            ORDER BY g.created_at DESC
        ''')
        rows = cursor.fetchall()
    finally:
        conn.close()
    return [
        GmailInvoiceFile(
            doc_type=_category_to_doc_type(row['category']),
            vendor_id=row['vendor_id'],
            vendor_name=row['vendor_name'],
            from_email=row['from_email'],
            document=_download_url(request, row['doc_url']),
            received_date=row['received_date']
        )
        for row in rows if os.path.exists(row['doc_url'])
    ]
@router.get('/invoices/download')
def download_invoice(path: str):
    cfg, _, _, _ = get_context()
    base_dir = os.path.abspath(cfg['storage']['base_dir'])
    requested = os.path.abspath(path)
    if not any(requested.startswith(d) for d in [base_dir]):
        raise HTTPException(status_code=400, detail='Path must be inside the invoices directory')
    if not os.path.exists(requested):
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(requested, filename=os.path.basename(requested))
app = FastAPI(title='Email Invoice Ingestion API', version='1.0.0')
app.include_router(router)