# Email Invoice Ingestion

Connects to a Gmail mailbox/label, periodically checks for new vendor
invoice emails, and extracts PDF/image attachments to a structured
local folder tree.

## Folder Structure

```
email_invoice_ingestion/
├── config/
│   └── config.yaml          # Gmail query, poll interval, file rules, paths
├── credentials/
│   ├── credentials.json     # OAuth client secret (you provide, gitignored)
│   └── token.json           # Auto-generated after first login
├── src/
│   ├── gmail_client.py      # Gmail API auth + list/get messages/attachments
│   ├── attachment_extractor.py  # Filters + saves PDF/image attachments
│   ├── utils.py              # Config loader, logging, processed-ID store
│   └── main.py                # Entry point / polling loop
├── data/
│   ├── invoices/
│   │   └── <YYYY>/<MM>/<sender_domain>/<message_id>_<filename>
│   ├── quarantine/           # oversized/rejected attachments
│   └── processed_message_ids.json
├── logs/
│   └── ingestion.log
└── requirements.txt
```

## Setup

1. **Google Cloud project**
   - Enable the Gmail API in Google Cloud Console.
   - Create an OAuth 2.0 Client ID (type: Desktop app).
   - Download the JSON and save it as `credentials/credentials.json`.

2. **Gmail mailbox prep**
   - Create a label (e.g. `Invoices`) and a Gmail filter that routes
     vendor invoice emails into it automatically.
   - Update `config/config.yaml` if you use a different label/query.

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **First run (interactive OAuth consent)**
   ```bash
   python src/main.py
   ```
   A browser window opens for one-time Google consent. After that,
   `credentials/token.json` is cached and auto-refreshed.

5. **Run continuously (polling every N seconds, from config.yaml)**
   ```bash
   python src/main.py --daemon
   ```
   In production, run this under a process manager (systemd, supervisor,
   or a scheduled cron job calling it without `--daemon` every N minutes).

## How it works (Steps 1 & 2)

1. `main.py` calls `GmailClient.list_messages()` using the search query
   in `config.yaml` (default: unread + attachment in the `Invoices` label).
2. For each new message, `AttachmentExtractor.process_message()` walks
   the MIME payload, keeps only attachments matching allowed types
   (`pdf`, `png`, `jpg`, `jpeg`, `tiff`, `webp`), downloads them via the
   Gmail API, and saves them under `data/invoices/YYYY/MM/sender_domain/`.
3. Processed message IDs are recorded in `processed_message_ids.json`
   and the message is labeled/marked read in Gmail, so re-polling never
   reprocesses the same email.

## Notes / next steps

- The OAuth scope used (`gmail.readonly` + `gmail.modify`) allows
  reading and labeling mail only — it cannot send or delete anything.
- Oversized attachments (over `max_size_mb`) go to `data/quarantine/`
  instead of `data/invoices/`.
- This covers ingestion only (steps 1–2). OCR/parsing of invoice data,
  validation, and downstream storage (e.g. a database or accounting
  system) would be separate follow-on modules.
