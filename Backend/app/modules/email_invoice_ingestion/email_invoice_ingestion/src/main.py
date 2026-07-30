"""
main.py
-------
Entry point for the Email Invoice Ingestion system.

Step 1: Periodically checks the Gmail mailbox/label for new messages.
Step 2: Identifies and extracts attached documents (PDF/image/scanned invoices).

Usage:
    python src/main.py            # run once and exit
    python src/main.py --daemon   # run continuously, polling on an interval
"""

import sys
import time
import logging
import argparse
import re
from datetime import datetime, timezone

from gmail_client import GmailClient
from attachment_extractor import AttachmentExtractor
from utils import load_config, setup_logging, ProcessedIdStore

logger = logging.getLogger(__name__)


def _header_value(full_message: dict, name: str) -> str:
    """Pulls a header (e.g. 'Subject', 'From') off a full Gmail message resource."""
    headers = full_message.get("payload", {}).get("headers", [])
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _received_date(full_message: dict):
    """Gmail's internalDate is epoch millis (UTC) -- convert to a plain date."""
    internal_date = full_message.get("internalDate")
    if internal_date:
        try:
            return datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc).date()
        except (ValueError, TypeError):
            pass
    return datetime.now(timezone.utc).date()


def _vendor_name_from_from_header(from_header: str) -> str:
    """'Millbrook Pest Solutions <billing@millbrookpest.com>' -> 'Millbrook Pest Solutions'"""
    match = re.match(r"^\s*\"?([^\"<]+?)\"?\s*<", from_header)
    if match:
        return match.group(1).strip()
    return from_header.strip() or "Unknown sender"


def run_once(gmail: GmailClient, extractor: AttachmentExtractor, cfg: dict, store: ProcessedIdStore):
    query = cfg["gmail"]["query"]
    max_results = cfg["polling"]["max_results_per_poll"]

    logger.info(f"Polling mailbox with query: '{query}'")
    messages = gmail.list_messages(query=query, max_results=max_results)
    logger.info(f"Found {len(messages)} matching message(s).")

    processed_label_id = gmail.ensure_label(cfg["gmail"]["processed_label_name"])

    new_count = 0
    all_saved_files = []
    message_records = []  # one entry per newly-processed message, for DB logging
    for msg_ref in messages:
        message_id = msg_ref["id"]

        if store.has(message_id):
            continue  # already handled in a previous poll

        full_message = gmail.get_message(message_id)
        if not full_message:
            continue

        saved_files = extractor.process_message(full_message)

        # Mark as processed regardless of whether attachments were found,
        # so we don't keep re-checking the same email every poll.
        gmail.modify_labels(
            message_id,
            add=[processed_label_id],
            remove=["UNREAD"],
        )

        store.add(message_id)
        new_count += 1

        message_records.append({
            "message_id": message_id,
            "subject": _header_value(full_message, "Subject") or "(no subject)",
            "vendor_name_raw": _vendor_name_from_from_header(_header_value(full_message, "From")),
            "received_date": _received_date(full_message),
            "saved_files": saved_files or [],
        })

        if saved_files:
            logger.info(f"[{message_id}] Extracted {len(saved_files)} file(s).")
            all_saved_files.extend(saved_files)
        else:
            logger.info(f"[{message_id}] No valid invoice attachments found.")

    store.save()
    logger.info(f"Poll complete. {new_count} new message(s) processed.")

    return all_saved_files, message_records


def main():
    parser = argparse.ArgumentParser(description="Email Invoice Ingestion")
    parser.add_argument("--daemon", action="store_true", help="Run continuously on a polling interval")
    parser.add_argument("--config", default="config/config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    setup_logging(cfg)

    gmail = GmailClient(credentials_dir="credentials")
    extractor = AttachmentExtractor(gmail, cfg)
    store = ProcessedIdStore(cfg["state"]["processed_ids_file"])

    if args.daemon:
        interval = cfg["polling"]["interval_seconds"]
        logger.info(f"Starting in daemon mode, polling every {interval}s. Ctrl+C to stop.")
        try:
            while True:
                run_once(gmail, extractor, cfg, store)
                time.sleep(interval)
        except KeyboardInterrupt:
            logger.info("Stopped by user.")
            sys.exit(0)
    else:
        run_once(gmail, extractor, cfg, store)


if __name__ == "__main__":
    main()