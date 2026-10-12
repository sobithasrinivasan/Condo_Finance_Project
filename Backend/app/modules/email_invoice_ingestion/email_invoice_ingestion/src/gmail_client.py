
import os
import base64
import logging
from typing import List, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Read-only + label-modify scope (does NOT allow sending/deleting mail)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


class GmailClient:
    def __init__(self, credentials_dir: str = "credentials"):
        self.credentials_dir = credentials_dir
        self.client_secret_path = os.path.join(credentials_dir, "credentials.json")
        self.token_path = os.path.join(credentials_dir, "token.json")
        self.service = self._authenticate()

    def _authenticate(self):
        """Handles OAuth2 flow. First run opens a browser for consent;
        subsequent runs reuse the cached token and auto-refresh it."""
        creds: Optional[Credentials] = None

        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.client_secret_path):
                    raise FileNotFoundError(
                        f"Missing OAuth client secret at {self.client_secret_path}. "
                        "Download it from Google Cloud Console > APIs & Services > "
                        "Credentials > OAuth 2.0 Client ID (Desktop app)."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.client_secret_path, SCOPES
                )
                creds = flow.run_local_server(port=0)

            os.makedirs(self.credentials_dir, exist_ok=True)
            with open(self.token_path, "w") as f:
                f.write(creds.to_json())

        return build("gmail", "v1", credentials=creds)

    def list_messages(self, query: str, max_results: int = 50) -> List[Dict]:
        """Returns a list of {id, threadId} dicts matching the search query."""
        try:
            results = []
            request = self.service.users().messages().list(
                userId="me", q=query, maxResults=max_results
            )
            while request is not None:
                response = request.execute()
                results.extend(response.get("messages", []))
                if len(results) >= max_results:
                    break
                request = self.service.users().messages().list_next(
                    previous_request=request, previous_response=response
                )
            return results[:max_results]
        except HttpError as e:
            logger.error(f"Gmail list_messages failed: {e}")
            return []

    def get_message(self, message_id: str) -> Optional[Dict]:
        """Fetches full message payload (headers + MIME parts)."""
        try:
            return self.service.users().messages().get(
                userId="me", id=message_id, format="full"
            ).execute()
        except HttpError as e:
            logger.error(f"Gmail get_message failed for {message_id}: {e}")
            return None

    def get_attachment(self, message_id: str, attachment_id: str) -> Optional[bytes]:
        """Downloads raw bytes of a specific attachment."""
        try:
            att = self.service.users().messages().attachments().get(
                userId="me", messageId=message_id, id=attachment_id
            ).execute()
            data = att.get("data", "")
            return base64.urlsafe_b64decode(data.encode("UTF-8"))
        except HttpError as e:
            logger.error(f"Gmail get_attachment failed for {message_id}: {e}")
            return None

    def ensure_label(self, label_name: str) -> str:
        """Returns label ID, creating the label (and nested path) if needed."""
        labels = self.service.users().labels().list(userId="me").execute().get("labels", [])
        for lbl in labels:
            if lbl["name"] == label_name:
                return lbl["id"]

        created = self.service.users().labels().create(
            userId="me",
            body={
                "name": label_name,
                "labelListVisibility": "labelShow",
                "messageListVisibility": "show",
            },
        ).execute()
        return created["id"]

    def modify_labels(self, message_id: str, add: List[str] = None, remove: List[str] = None):
        """Add/remove label IDs on a message (e.g. mark processed, remove unread)."""
        body = {"addLabelIds": add or [], "removeLabelIds": remove or []}
        try:
            self.service.users().messages().modify(
                userId="me", id=message_id, body=body
            ).execute()
        except HttpError as e:
            logger.error(f"Gmail modify_labels failed for {message_id}: {e}")
