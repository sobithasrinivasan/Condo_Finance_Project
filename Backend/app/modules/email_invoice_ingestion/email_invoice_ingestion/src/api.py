import os
import sys
import logging
from urllib.parse import quote
import pypdf
from datetime import date
sys.path.insert(0, os.path.dirname(__file__))
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db_connection
from mysql.connector import IntegrityError
from gmail_client import GmailClient
from attachment_extractor import AttachmentExtractor
from utils import load_config, setup_logging, ProcessedIdStore
from main import run_once as _run_once_poll
import json
logger = logging.getLogger(__name__)
VALID_GMAIL_STATUSES = {'Imported', 'Duplicate', 'Failed', 'Unprocessed'}

def _parse_allowed_roots() -> List[str]:
    raw = os.environ.get('EMAIL_INGESTION_ALLOWED_ROOTS', '')
    return [os.path.abspath(p.strip()) for p in raw.split(os.pathsep) if p.strip()]
_ALLOWED_ROOTS = _parse_allowed_roots()
SUPPORTED_DOC_TYPES = {'pest_services'}
CATEGORY_TO_DOC_TYPE = {'Pest Services': 'pest_services', 'Telephone Provider': 'telephone_provider', 'Property Management': 'property_management', 'Electric & Gas Company': 'electric_gas', 'Landscaping': 'landscaping'}
_manifest_cache: dict = {}

def _load_manifest(root: str) -> dict:
    if root in _manifest_cache:
        return _manifest_cache[root]
    manifest_path = os.path.join(root, 'manifest.json')
    lookup = {}
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            for doc in data.get('documents', []):
                fname = os.path.basename(doc.get('document', ''))
                if fname:
                    lookup[fname] = {'doc_type': doc.get('doc_type'), 'vendor_id': doc.get('vendor_id'), 'vendor_name': doc.get('vendor_name')}
        except Exception as e:
            logger.warning(f'Could not read manifest at {manifest_path}: {e}')
    _manifest_cache[root] = lookup
    return lookup

def _lookup_invoice_meta(root: str, filename: str) -> dict:
    lookup = _load_manifest(root)
    return lookup.get(filename, {'doc_type': None, 'vendor_id': None, 'vendor_name': None})
router = APIRouter(prefix='/gmail-invoices', tags=['Email Invoice Ingestion'])
_MODULE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIG_PATH = os.path.join(_MODULE_DIR, 'config', 'config.yaml')
_CREDENTIALS_DIR = os.path.join(_MODULE_DIR, 'credentials')
_cfg = None
_gmail = None
_extractor = None
_store = None

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
    base = str(request.url_for('download_invoice'))
    return f'{base}?path={quote(file_path)}'

class InvoiceFile(BaseModel):
    path: str
    size_bytes: int
    url: str

class PollResult(BaseModel):
    query: str
    messages_found: int
    new_processed: int
    files: List[InvoiceFile]

def _extract_pdf_text(file_path: str, max_pages: int=1) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ''
        for page in reader.pages[:max_pages]:
            text += (page.extract_text() or '') + '\n'
        return text
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
        cursor.execute('SELECT id, name FROM vendors')
        vendors = cursor.fetchall()
    finally:
        conn.close()
    for v in vendors:
        if v['name'].lower() in text:
            return v['id']
    return None

def _lookup_vendor_id(vendor_name_raw: str, sender_email: str=''):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        sender_domain = sender_email.split('@')[-1].lower() if '@' in sender_email else ''
        if sender_domain:
            cursor.execute("SELECT id FROM vendors WHERE LOWER(SUBSTRING_INDEX(email, '@', -1)) = %s", (sender_domain,))
            row = cursor.fetchone()
            if row:
                return row['id']
        if not vendor_name_raw:
            return None
        cursor.execute('SELECT id FROM vendors WHERE name = %s', (vendor_name_raw,))
        row = cursor.fetchone()
        if row:
            return row['id']
        cursor.execute("SELECT id FROM vendors WHERE %s LIKE CONCAT('%%', name, '%%') OR name LIKE CONCAT('%%', %s, '%%') LIMIT 1", (vendor_name_raw, vendor_name_raw))
        row = cursor.fetchone()
        return row['id'] if row else None
    finally:
        conn.close()

def _record_gmail_import(record: dict, file_path: str=None, status: str='Imported', error_message: str=None):
    vendor_id = _lookup_vendor_id_from_document(file_path)
    if vendor_id is None:
        vendor_id = _lookup_vendor_id(record['vendor_name_raw'], record.get('sender_email', ''))
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        try:
            cursor.execute('\n                INSERT INTO gmail_imported_emails\n                    (gmail_message_id, from_email, vendor_id, vendor_name, subject, received_date,\n                     doc_url, status, error_message, created_by)\n                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)\n                ', (record['message_id'], record.get('sender_email', ''), vendor_id, record['vendor_name_raw'], record['subject'], record['received_date'], file_path, status, error_message, 'gmail_poll'))
            conn.commit()
        except IntegrityError:
            conn.rollback()
            logger.info(f"[{record['message_id']}] Already recorded in gmail_imported_emails, skipping.")
    except Exception as e:
        logger.error(f"[{record['message_id']}] Failed to record gmail_imported_emails row: {e}")
    finally:
        conn.close()

@router.post('/gmail/poll', response_model=PollResult, summary='Run one full ingestion cycle (find, download, label as processed, and log each result into gmail_imported_emails)')
def poll_mailbox(request: Request):
    cfg, gmail, extractor, store = get_context()
    query = cfg['gmail']['query']
    before_count = len(store._ids)
    try:
        saved_files, message_records = _run_once_poll(gmail, extractor, cfg, store)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    after_count = len(store._ids)
    for record in message_records:
        if record['saved_files']:
            for fp in record['saved_files']:
                _record_gmail_import(record, file_path=fp, status='Imported')
        else:
            _record_gmail_import(record, file_path=None, status='Failed', error_message='No valid invoice attachments found in this email.')
    files = [InvoiceFile(path=fp, size_bytes=os.path.getsize(fp) if os.path.exists(fp) else 0, url=_download_url(request, fp)) for fp in saved_files or []]
    messages = gmail.list_messages(query=query, max_results=cfg['polling']['max_results_per_poll'])
    return PollResult(query=query, messages_found=len(messages), new_processed=after_count - before_count, files=files)

@router.get('/invoices', response_model=List[InvoiceFile], summary='List all downloaded invoice files')
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

class LocalInvoiceFile(BaseModel):
    doc_type: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    document: str
    size_bytes: int

@router.get('/invoices/local', response_model=List[LocalInvoiceFile], summary='List invoice files from EMAIL_INGESTION_ALLOWED_ROOTS, enriched with vendor/doc_type looked up from the manifest by filename. Only currently-supported doc_types are returned.')
def list_local_invoices(request: Request, doc_type: Optional[str]=None):
    if not _ALLOWED_ROOTS:
        raise HTTPException(status_code=500, detail='EMAIL_INGESTION_ALLOWED_ROOTS is not set on the server.')
    if doc_type is not None and doc_type not in SUPPORTED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"doc_type '{doc_type}' is not supported yet. Supported: {sorted(SUPPORTED_DOC_TYPES)}")
    results: List[LocalInvoiceFile] = []
    for root in _ALLOWED_ROOTS:
        if not os.path.isdir(root):
            continue
        for fname in os.listdir(root):
            full_path = os.path.join(root, fname)
            if not os.path.isfile(full_path):
                continue
            meta = _lookup_invoice_meta(root, fname)
            file_doc_type = meta.get('doc_type')
            if file_doc_type not in SUPPORTED_DOC_TYPES:
                continue
            if doc_type is not None and file_doc_type != doc_type:
                continue
            results.append(LocalInvoiceFile(doc_type=file_doc_type, vendor_id=meta.get('vendor_id'), vendor_name=meta.get('vendor_name'), document=_download_url(request, full_path), size_bytes=os.path.getsize(full_path)))
    return results

class GmailInvoiceFile(BaseModel):
    doc_type: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: str
    from_email: Optional[str] = None
    document: str
    received_date: Optional[date] = None

@router.get('/invoices/gmail', response_model=List[GmailInvoiceFile], summary='List invoice documents recorded in gmail_imported_emails, with vendor_name from vendors and doc_type derived from vendor category')
def list_gmail_invoices(request: Request):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('\n            SELECT g.vendor_id, COALESCE(v.name, g.vendor_name) AS vendor_name,\n                   v.category, g.doc_url, g.received_date, g.from_email\n            FROM gmail_imported_emails g\n            LEFT JOIN vendors v ON v.id = g.vendor_id\n            WHERE g.doc_url IS NOT NULL\n            ORDER BY g.created_at DESC\n            ')
        rows = cursor.fetchall()
    finally:
        conn.close()
    results: List[GmailInvoiceFile] = []
    for row in rows:
        if not os.path.exists(row['doc_url']):
            continue
        results.append(GmailInvoiceFile(doc_type=CATEGORY_TO_DOC_TYPE.get(row['category']), vendor_id=row['vendor_id'], vendor_name=row['vendor_name'], from_email=row['from_email'], document=_download_url(request, row['doc_url']), received_date=row['received_date']))
    return results

@router.get('/invoices/download', summary='Download a specific saved invoice file')
def download_invoice(path: str):
    cfg, _, _, _ = get_context()
    base_dir = os.path.abspath(cfg['storage']['base_dir'])
    requested = os.path.abspath(path)
    allowed_dirs = [base_dir] + _ALLOWED_ROOTS
    if not any((requested.startswith(d) for d in allowed_dirs)):
        raise HTTPException(status_code=400, detail='Path must be inside an allowed invoices directory')
    if not os.path.exists(requested):
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(requested, filename=os.path.basename(requested))
app = FastAPI(title='Email Invoice Ingestion API', description='Trigger Gmail invoice polling/extraction and inspect results.', version='1.0.0')
app.include_router(router)