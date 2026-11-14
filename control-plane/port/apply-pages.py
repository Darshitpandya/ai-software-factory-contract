#!/usr/bin/env python3
"""
apply-pages.py — Portal as Code: apply all saved Port page configurations.

Usage:
  python3 control-plane/port/apply-pages.py

Requirements:
  PORT_CLIENT_ID and PORT_CLIENT_SECRET must be set (from .env or environment).

What it does:
  Reads every *.json file in control-plane/port/pages/ and PUT it to the Port API.
  Idempotent — safe to run multiple times.

Restoration workflow:
  1. If Port org is fresh: run Terraform first to create blueprints
     cd infra/terraform && terraform apply
  2. Then run this script to restore all page layouts and widgets
     python3 control-plane/port/apply-pages.py
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

PORT_CLIENT_ID = os.environ.get("PORT_CLIENT_ID")
PORT_CLIENT_SECRET = os.environ.get("PORT_CLIENT_SECRET")

if not PORT_CLIENT_ID or not PORT_CLIENT_SECRET:
    print("ERROR: PORT_CLIENT_ID and PORT_CLIENT_SECRET must be set")
    sys.exit(1)

PAGES_DIR = Path(__file__).parent / "pages"

# Get token
req = urllib.request.Request(
    "https://api.getport.io/v1/auth/access_token",
    data=json.dumps({"clientId": PORT_CLIENT_ID, "clientSecret": PORT_CLIENT_SECRET}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read())["accessToken"]

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

ok_count = 0
err_count = 0

for page_file in sorted(PAGES_DIR.glob("*.json")):
    with open(page_file, encoding="utf-8") as f:
        page = json.load(f)
    
    page_id = page.get("identifier", "")
    encoded = urllib.parse.quote(page_id, safe="")
    
    req = urllib.request.Request(
        f"https://api.getport.io/v1/pages/{encoded}",
        data=json.dumps(page).encode("utf-8"),
        headers=headers,
        method="PUT"
    )
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            if result.get("ok"):
                print(f"✓ {page_id}")
                ok_count += 1
            else:
                print(f"✗ {page_id}: {result.get('message','?')[:80]}")
                err_count += 1
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            msg = json.loads(body).get("message", body)[:80]
        except Exception:
            msg = body[:80]
        print(f"✗ {page_id}: HTTP {e.code} {msg}")
        err_count += 1
    except Exception as e:
        print(f"✗ {page_id}: {e}")
        err_count += 1

print(f"\n{'✅' if err_count == 0 else '⚠️ '} {ok_count} applied, {err_count} errors")
if err_count > 0:
    sys.exit(1)
