#!/usr/bin/env python3
"""
Red Hat case attachments: list and download.
MODIFIED: Added command-line arguments and streaming for 40GB downloads.

Usage (Automated):
  python3 script.py <CASE_ID> <ATTACH_NUM> <FILENAME>
Usage (Interactive):
  python3 script.py <CASE_ID>
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "config.json"


def _load_hydra_credentials() -> tuple[str, str]:
    client_id = ""
    client_secret = ""
    try:
        if _CONFIG_PATH.is_file():
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                cfg = json.load(f)
            hydra = cfg.get("hydra")
            if isinstance(hydra, dict):
                client_id = (hydra.get("client_id") or "").strip()
                client_secret = (hydra.get("client_secret") or "").strip()
    except Exception:
        pass
    if not client_id:
        client_id = os.environ.get("HYDRA_CLIENT_ID", "").strip()
    if not client_secret:
        client_secret = os.environ.get("HYDRA_CLIENT_SECRET", "").strip()
    return client_id, client_secret


BASE_URL = "https://access.redhat.com/hydra/rest/cases"
ATTACHMENTS_DOWNLOAD_BASE = "https://attachments.access.redhat.com/hydra/rest/cases"
SSO_TOKEN_URL = (
    "https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token"
)


def _fetch_sso_token(client_id, client_secret):
    import base64
    from urllib.parse import urlencode

    body = urlencode(
        {
            "grant_type": "client_credentials",
            "scope": "api.customer_case_management",
        }
    ).encode("utf-8")
    credentials = f"{client_id}:{client_secret}"
    b64 = base64.standard_b64encode(credentials.encode("utf-8")).decode("ascii")
    req = urllib.request.Request(
        SSO_TOKEN_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {b64}",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def get_attachments(case_number, token):
    url = f"{BASE_URL}/{case_number}/attachments"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def download_attachment(case_number, attachment_uuid, token, output_path):
    """Downloads file in 1MB chunks to prevent OOM crashes."""
    url = f"{ATTACHMENTS_DOWNLOAD_BASE}/{case_number}/attachments/{attachment_uuid}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )
    print(f"Starting stream: {url} -> {output_path}")
    with urllib.request.urlopen(req, timeout=60) as resp:
        with open(output_path, "wb") as f:
            while True:
                chunk = resp.read(1024 * 1024)  # Read 1MB at a time
                if not chunk:
                    break
                f.write(chunk)
                # Simple progress indicator for large files
                if os.path.exists(output_path):
                    size = os.path.getsize(output_path) / (1024 * 1024 * 1024)
                    print(f"Downloaded: {size:.2f} GB...", end="\r")
    print("\nDownload complete.")


def _normalize_attachments_list(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("data", "attachments", "items", "results"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def _attachment_uuid(item):
    for key in ("uuid", "attachmentId", "id", "downloadId", "Id"):
        val = item.get(key)
        if val is not None:
            return str(val).strip()
    return None


def main():
    case_number = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not case_number:
        print("Usage: python script.py <CASE_NUMBER> [ATTACH_NUM] [FILENAME]")
        sys.exit(1)

    client_id, client_secret = _load_hydra_credentials()
    if not client_id or not client_secret:
        print(
            "Hydra credentials missing. Set hydra.client_id/client_secret in "
            "src/api/config/config.json or HYDRA_CLIENT_ID / HYDRA_CLIENT_SECRET.",
            file=sys.stderr,
        )
        sys.exit(1)
    token_response = _fetch_sso_token(client_id, client_secret)
    TOKEN = token_response.get("access_token")

    data = get_attachments(case_number, TOKEN)
    items = _normalize_attachments_list(data)

    if not items:
        print("No attachments found.")
        sys.exit(1)

    print("Available attachments:")
    for i, item in enumerate(items, 1):
        name = item.get("fileName") or item.get("name") or "unknown"
        print(f"  {i}. {name}")

    # LOGIC: Check if ATTACH_NUM was passed in sys.argv[2]
    if len(sys.argv) > 2:
        choice = sys.argv[2].strip()
        print(f"Automated Selection: {choice}")
    else:
        choice = input(f"Enter attachment number (1-{len(items)}): ").strip()

    if choice.isdigit():
        idx = int(choice)
        attachment_id = _attachment_uuid(items[idx - 1])
    else:
        attachment_id = choice

    # LOGIC: Check if FILENAME was passed in sys.argv[3]
    if len(sys.argv) > 3:
        filename = sys.argv[3].strip()
        print(f"Automated Filename: {filename}")
    else:
        filename = input("Enter filename (default: auto): ").strip()

    if not filename:
        filename = f"case_{case_number}_file_{attachment_id}.zip"

    download_attachment(case_number, attachment_id, TOKEN, filename)


if __name__ == "__main__":
    main()
