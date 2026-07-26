

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from gmail_client import GmailClient  # noqa: E402


def try_query(gmail, query, label):
    print(f"\n[{label}] query = {query!r}")
    results = gmail.service.users().messages().list(
        userId="me", q=query, maxResults=10
    ).execute()
    msgs = results.get("messages", [])
    print(f"  -> {len(msgs)} message(s): {[m['id'] for m in msgs]}")
    return msgs


def main():
    gmail = GmailClient(credentials_dir="credentials")

    # 1. List all labels and find the exact "Invoices" label + its ID
    labels = gmail.service.users().labels().list(userId="me").execute().get("labels", [])
    invoices_labels = [l for l in labels if "invoice" in l["name"].lower()]
    print("Labels containing 'invoice':")
    for l in invoices_labels:
        print(f"  id={l['id']!r}  name={l['name']!r}  type={l['type']}")

    if not invoices_labels:
        print("\n❌ No label containing 'invoice' found on this account at all.")
        print("   This means the OAuth token may be tied to a different Google")
        print("   account than the one where you created the label in the browser.")
        return

    # 2. Try progressively narrower queries
    try_query(gmail, "has:attachment", "has:attachment only")
    try_query(gmail, "label:Invoices", "label:Invoices only")
    try_query(gmail, "label:Invoices has:attachment", "combined (same as config.yaml)")


if __name__ == "__main__":
    main()
