
import os
import sys
import logging
import re
from urllib.parse import quote
 
sys.path.insert(0, os.path.dirname(__file__))
 
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
 
from gmail_client import GmailClient
from attachment_extractor import AttachmentExtractor
from utils import load_config, setup_logging, ProcessedIdStore
from main import run_once as _run_once_poll

import json

logger = logging.getLogger(__name__)


def _parse_allowed_roots() -> List[str]:
    raw = os.environ.get("EMAIL_INGESTION_ALLOWED_ROOTS", "")
    return [
        os.path.abspath(part.strip())
        for part in re.split(r"[,;\n]+", raw)
        if part.strip()
    ]


_ALLOWED_ROOTS = _parse_allowed_roots()


SUPPORTED_DOC_TYPES = {
    "invoice",
    "bank_statement",
    "electric_and_gas_company",
    "pest_services",
    "property_management",
    "telephone_provider",
}

# filename -> {doc_type, vendor_id, vendor_name}, cached per root folder
_manifest_cache: dict = {}


def _load_manifest(root: str) -> dict:
   
    if root in _manifest_cache:
        return _manifest_cache[root]

    manifest_path = os.path.join(root, "manifest.json")
    lookup = {}
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for doc in data.get("documents", []):
                fname = os.path.basename(doc.get("document", ""))
                if fname:
                    lookup[fname] = {
                        "doc_type": doc.get("doc_type"),
                        "vendor_id": doc.get("vendor_id"),
                        "vendor_name": doc.get("vendor_name"),
                    }
        except Exception as e:
            logger.warning(f"Could not read manifest at {manifest_path}: {e}")

    _manifest_cache[root] = lookup
    return lookup


def _lookup_invoice_meta(root: str, filename: str) -> dict:
    lookup = _load_manifest(root)
    return lookup.get(filename, {"doc_type": None, "vendor_id": None, "vendor_name": None})


def _normalize_doc_type(doc_type: Optional[str]) -> Optional[str]:
    if doc_type is None:
        return None

    normalized = doc_type.strip().lower().replace(" ", "_").replace("-", "_")
    normalized = re.sub(r"_+", "_", normalized)

    if normalized in {"bankstatement", "bank_statement", "bank_statements", "statement", "statements"}:
        return "bank_statement"
    if normalized in {"invoice", "invoices"}:
        return "invoice"

    return normalized
 
router = APIRouter(
    prefix="/gmail-invoices",
    tags=["Email Invoice Ingestion"],
)
 
# Module base dir = email_invoice_ingestion/ (two levels up from this file: src/api.py)
_MODULE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIG_PATH = os.path.join(_MODULE_DIR, "config", "config.yaml")
_CREDENTIALS_DIR = os.path.join(_MODULE_DIR, "credentials")
 
# Lazily-initialized shared context (auth happens once, on first request)
_cfg = None
_gmail = None
_extractor = None
_store = None
 
 
def get_context():
    
    global _cfg, _gmail, _extractor, _store
    if _gmail is None:
        cfg = load_config(_CONFIG_PATH)
 
        # Resolve relative paths in config.yaml against the module dir
        cfg["storage"]["base_dir"] = os.path.join(_MODULE_DIR, cfg["storage"]["base_dir"])
        cfg["storage"]["quarantine_dir"] = os.path.join(_MODULE_DIR, cfg["storage"]["quarantine_dir"])
        cfg["state"]["processed_ids_file"] = os.path.join(_MODULE_DIR, cfg["state"]["processed_ids_file"])
        cfg["logging"]["log_dir"] = os.path.join(_MODULE_DIR, cfg["logging"]["log_dir"])
 
        setup_logging(cfg)
        _cfg = cfg
        _gmail = GmailClient(credentials_dir=_CREDENTIALS_DIR)
        _extractor = AttachmentExtractor(_gmail, _cfg)
        _store = ProcessedIdStore(_cfg["state"]["processed_ids_file"])
    return _cfg, _gmail, _extractor, _store
 
 
def _download_url(request: Request, file_path: str) -> str:
    
    base = str(request.url_for("download_invoice"))
    return f"{base}?path={quote(file_path)}"
 
 
# ---------------------------------------------------------------- schemas
 
class InvoiceFile(BaseModel):
    path: str
    size_bytes: int
    url: str
 
 
class PollResult(BaseModel):
    query: str
    messages_found: int
    new_processed: int
    files: List[InvoiceFile]
 
 
class DiagnoseResult(BaseModel):
    query: str
    count: int
    message_ids: List[str]
 
 
# ---------------------------------------------------------------- routes
 
 
@router.post(
    "/gmail/poll",
    response_model=PollResult,
    summary="Run one full ingestion cycle (find, download, label as processed)",
)
def poll_mailbox(request: Request):
    cfg, gmail, extractor, store = get_context()
    query = cfg["gmail"]["query"]
 
    before_count = len(store._ids)
    try:
        saved_files = _run_once_poll(gmail, extractor, cfg, store)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    after_count = len(store._ids)
 
    files = [
        InvoiceFile(
            path=fp,
            size_bytes=os.path.getsize(fp) if os.path.exists(fp) else 0,
            url=_download_url(request, fp),
        )
        for fp in (saved_files or [])
    ]
 
    # Report how many currently match the query overall (for visibility)
    messages = gmail.list_messages(query=query, max_results=cfg["polling"]["max_results_per_poll"])
 
    return PollResult(
        query=query,
        messages_found=len(messages),
        new_processed=after_count - before_count,
        files=files,
    )
 
 
@router.get(
    "/invoices",
    response_model=List[InvoiceFile],
    summary="List all downloaded invoice files",
)
def list_invoices(request: Request):
    cfg, _, _, _ = get_context()
    base_dir = cfg["storage"]["base_dir"]
    files = []
    if os.path.exists(base_dir):
        for root, _, filenames in os.walk(base_dir):
            for fn in filenames:
                full_path = os.path.join(root, fn)
                files.append(
                    InvoiceFile(
                        path=full_path,
                        size_bytes=os.path.getsize(full_path),
                        url=_download_url(request, full_path),
                    )
                )
    return files
 
 
class LocalInvoiceFile(BaseModel):
    doc_type: Optional[str] = None
    vendor_id: Optional[int] = None
    vendor_name: Optional[str] = None
    document: str  # download link, not a raw filesystem path
    size_bytes: int


@router.get(
    "/invoices/local",
    response_model=List[LocalInvoiceFile],
    summary="List invoice files from EMAIL_INGESTION_ALLOWED_ROOTS, enriched "
            "with vendor/doc_type looked up from the manifest by filename. "
            "Only currently-supported doc_types are returned.",
)
def list_local_invoices(request: Request, doc_type: Optional[str] = None):
    if not _ALLOWED_ROOTS:
        raise HTTPException(
            status_code=500,
            detail="EMAIL_INGESTION_ALLOWED_ROOTS is not set on the server.",
        )

    normalized_filter = _normalize_doc_type(doc_type)

    if normalized_filter is not None and normalized_filter not in SUPPORTED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"doc_type '{doc_type}' is not supported yet. "
                   f"Supported: {sorted(SUPPORTED_DOC_TYPES)}",
        )

    results: List[LocalInvoiceFile] = []
    for root in _ALLOWED_ROOTS:
        if not os.path.isdir(root):
            continue
        for fname in os.listdir(root):
            full_path = os.path.join(root, fname)
            if not os.path.isfile(full_path):
                continue

            meta = _lookup_invoice_meta(root, fname)
            file_doc_type = _normalize_doc_type(meta.get("doc_type"))

            # Skip anything not in the supported whitelist
            if file_doc_type not in SUPPORTED_DOC_TYPES:
                continue
            # If the caller asked for a specific doc_type, skip the rest
            if normalized_filter is not None and file_doc_type != normalized_filter:
                continue

            results.append(
                LocalInvoiceFile(
                    doc_type=file_doc_type,
                    vendor_id=meta.get("vendor_id"),
                    vendor_name=meta.get("vendor_name"),
                    document=_download_url(request, full_path),
                    size_bytes=os.path.getsize(full_path),
                )
            )
    return results


@router.get("/invoices/download", summary="Download a specific saved invoice file")
def download_invoice(path: str):
    cfg, _, _, _ = get_context()
    base_dir = os.path.abspath(cfg["storage"]["base_dir"])
    requested = os.path.abspath(path)

    # Allowed = pipeline's own storage dir OR any EMAIL_INGESTION_ALLOWED_ROOTS folder
    allowed_dirs = [base_dir] + _ALLOWED_ROOTS

    # Prevent path traversal outside the invoices directory
    if not any(requested.startswith(d) for d in allowed_dirs):
        raise HTTPException(status_code=400, detail="Path must be inside an allowed invoices directory")
    if not os.path.exists(requested):
        raise HTTPException(status_code=404, detail="File not found")
 
    return FileResponse(
        requested,
        filename=os.path.basename(requested),
    )
 
 

app = FastAPI(
    title="Email Invoice Ingestion API",
    description="Trigger Gmail invoice polling/extraction and inspect results.",
    version="1.0.0",
)
app.include_router(router)
