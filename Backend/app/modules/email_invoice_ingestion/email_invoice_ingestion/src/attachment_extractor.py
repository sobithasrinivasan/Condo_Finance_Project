import os
import re
import logging
from datetime import datetime
from email.utils import parseaddr

logger = logging.getLogger(__name__)


def _sanitize_filename(name: str) -> str:
    name = re.sub(r"[^\w\-.() ]", "_", name).strip()
    return name or "attachment"


def _walk_parts(payload, parts_accum):
    """Recursively collects MIME parts that carry an attachment (has a filename)."""
    if not payload:
        return
    if payload.get("filename"):
        parts_accum.append(payload)
    for sub in payload.get("parts", []) or []:
        _walk_parts(sub, parts_accum)


def get_header(headers, name):
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


class AttachmentExtractor:
    def __init__(self, gmail_client, config: dict):
        self.gmail = gmail_client
        self.cfg = config
        self.base_dir = config["storage"]["base_dir"]
        self.quarantine_dir = config["storage"]["quarantine_dir"]
        self.allowed_mimes = set(config["attachments"]["allowed_mime_types"])
        self.allowed_exts = set(config["attachments"]["allowed_extensions"])
        self.max_bytes = config["attachments"]["max_size_mb"] * 1024 * 1024

    def _is_allowed(self, filename: str, mime_type: str) -> bool:
        ext = os.path.splitext(filename)[1].lower()
        return mime_type in self.allowed_mimes or ext in self.allowed_exts

    def _target_dir(self, sender_domain: str, received_dt: datetime) -> str:
        path = os.path.join(
            self.base_dir,
            f"{received_dt.year:04d}",
            f"{received_dt.month:02d}",
            sender_domain,
        )
        os.makedirs(path, exist_ok=True)
        return path

    def process_message(self, message: dict) -> list:
        """
        Extracts and saves all valid attachments from one Gmail message.
        Returns a list of saved file paths (empty if none found/valid).
        """
        saved_files = []
        message_id = message["id"]
        headers = message.get("payload", {}).get("headers", [])

        sender_raw = get_header(headers, "From")
        _, sender_email = parseaddr(sender_raw)
        sender_domain = (sender_email.split("@")[-1] if "@" in sender_email else "unknown").lower()
        sender_domain = _sanitize_filename(sender_domain)

        internal_ts_ms = int(message.get("internalDate", "0"))
        received_dt = datetime.fromtimestamp(internal_ts_ms / 1000) if internal_ts_ms else datetime.now()

        parts = []
        _walk_parts(message.get("payload", {}), parts)

        if not parts:
            logger.info(f"[{message_id}] No attachments found.")
            return saved_files

        target_dir = self._target_dir(sender_domain, received_dt)

        for part in parts:
            filename = _sanitize_filename(part.get("filename", ""))
            mime_type = part.get("mimeType", "application/octet-stream")
            body = part.get("body", {})
            size = body.get("size", 0)
            attachment_id = body.get("attachmentId")

            if not attachment_id:
                continue  # inline body part, not a real attachment

            if not self._is_allowed(filename, mime_type):
                logger.info(f"[{message_id}] Skipping non-invoice file type: {filename} ({mime_type})")
                continue

            if size and size > self.max_bytes:
                logger.warning(f"[{message_id}] {filename} exceeds max size, quarantining.")
                dest_dir = self.quarantine_dir
                os.makedirs(dest_dir, exist_ok=True)
            else:
                dest_dir = target_dir

            data = self.gmail.get_attachment(message_id, attachment_id)
            if data is None:
                logger.error(f"[{message_id}] Failed to download {filename}")
                continue

            safe_name = f"{message_id}_{filename}"
            dest_path = os.path.join(dest_dir, safe_name)

            if self.cfg["storage"].get("duplicate_check", True) and os.path.exists(dest_path):
                logger.info(f"[{message_id}] {safe_name} already exists, skipping.")
                saved_files.append(dest_path)
                continue

            with open(dest_path, "wb") as f:
                f.write(data)

            logger.info(f"[{message_id}] Saved attachment -> {dest_path}")
            saved_files.append(dest_path)

        return saved_files
