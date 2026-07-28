import sys
import os

# Allow running this script directly from src/
sys.path.insert(0, os.path.dirname(__file__))

from gmail_client import GmailClient  # noqa: E402


def main():
    print("Connecting to Gmail API...")
    try:
        gmail = GmailClient(credentials_dir="credentials")
    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Authentication failed: {e}")
        sys.exit(1)

    print("✅ Authenticated successfully.\n")

    print("Fetching your 5 most recent emails as a sanity check...\n")
    messages = gmail.list_messages(query="", max_results=5)

    if not messages:
        print("No messages found (or query returned nothing). "
              "Connection works, but check your mailbox has mail.")
        return

    for i, msg_ref in enumerate(messages, start=1):
        full = gmail.get_message(msg_ref["id"])
        if not full:
            continue
        headers = full.get("payload", {}).get("headers", [])
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "(no subject)")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "(unknown sender)")
        print(f"{i}. From: {sender}")
        print(f"   Subject: {subject}\n")

    print("✅ Connection test complete. Gmail API access is working.")
    print("\nNext: try your actual invoice query, e.g.:")
    print('  python -c "from gmail_client import GmailClient; '
          'g = GmailClient(); print(len(g.list_messages(\'has:attachment\', 10)))"')
    print("Or just run: python src/main.py")


if __name__ == "__main__":
    main()
