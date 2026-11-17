#!/usr/bin/env python3
"""
backfill-port-runs.py — Read evidence/runs artifact records and update Port entities.

Idempotent. Safe to run multiple times.

Usage:
  python3 scripts/backfill-port-runs.py

Requires PORT_CLIENT_ID and PORT_CLIENT_SECRET in environment (from .env).
"""

import os, sys, json, math, urllib.request, urllib.parse
from pathlib import Path

# ── Pricing matches packages/claude-executor/src/index.ts MODEL_PRICING ──────
PRICING = {
    "claude-opus-5-5":   {"in": 15.0,  "out": 75.0},
    "claude-sonnet-5-5": {"in": 3.0,   "out": 15.0},
    "claude-haiku-5-5":  {"in": 0.25,  "out": 1.25},
    "claude-fable-5-2":  {"in": 1.0,   "out": 5.0},
}

STAGE_ORDER = [
    "product-requirements", "software-architecture",
    "software-engineering", "security-compliance", "platform-operations",
]

STAGE_LABEL = {
    "product-requirements":  "PRD",
    "software-architecture": "ARCH",
    "software-engineering":  "ENG",
    "security-compliance":   "SEC",
    "platform-operations":   "OPS",
}

ROOT = Path(__file__).parent.parent
EVIDENCE_ROOT = ROOT / "evidence" / "runs"

PORT_CLIENT_ID = os.environ.get("PORT_CLIENT_ID")
PORT_CLIENT_SECRET = os.environ.get("PORT_CLIENT_SECRET")

if not PORT_CLIENT_ID or not PORT_CLIENT_SECRET:
    print("ERROR: PORT_CLIENT_ID and PORT_CLIENT_SECRET must be set")
    sys.exit(1)


def get_token():
    req = urllib.request.Request(
        "https://api.getport.io/v1/auth/access_token",
        data=json.dumps({"clientId": PORT_CLIENT_ID, "clientSecret": PORT_CLIENT_SECRET}).encode(),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["accessToken"]


def upsert_entity(token, blueprint, identifier, properties):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = json.dumps({"identifier": identifier, "properties": properties}).encode()
    req = urllib.request.Request(
        f"https://api.getport.io/v1/blueprints/{blueprint}/entities?upsert=true&merge=true",
        data=body, headers=headers, method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read()).get("ok", False)


def process_run(run_dir: Path):
    """Read artifact.json files for all stages, compute metrics, build breakdown."""
    run_id = run_dir.name
    rows = []
    total_in = total_out = total_cost = 0
    tokens_by_model: dict[str, int] = {}

    for stage in STAGE_ORDER:
        stage_dir = run_dir / stage
        if not stage_dir.exists():
            continue

        # Latest artifact (by dir name desc, skip workspace)
        artifacts = sorted([
            d / "artifact.json"
            for d in stage_dir.iterdir()
            if d.is_dir() and d.name != "workspace" and (d / "artifact.json").exists()
        ], reverse=True)

        if not artifacts:
            continue

        try:
            art = json.loads(artifacts[0].read_text())
        except Exception:
            continue

        art_in = (art.get("tokenUsage") or {}).get("inputTokens", 0) or 0
        art_out = (art.get("tokenUsage") or {}).get("outputTokens", 0) or 0
        model = art.get("modelUsed", "unknown")
        p = PRICING.get(model, PRICING["claude-opus-5-5"])
        cost = (art_in / 1_000_000) * p["in"] + (art_out / 1_000_000) * p["out"]

        total_in += art_in
        total_out += art_out
        total_cost += cost
        tokens_by_model[model] = tokens_by_model.get(model, 0) + art_in + art_out

        label = STAGE_LABEL.get(stage, stage)
        rows.append(f"| {label} | `{model}` | {art_in:,} | {art_out:,} | ${cost:.2f} |")

    if not rows:
        return None

    rows.append(f"| **Total** | | **{total_in:,}** | **{total_out:,}** | **${total_cost:.2f}** |")

    breakdown = (
        "| Stage | Model | Input Tokens | Output Tokens | Cost |\n"
        "|-------|-------|-------------|--------------|------|\n"
        + "\n".join(rows)
    )

    # Dominant model: highest total tokens
    dominant_model = max(tokens_by_model, key=tokens_by_model.get) if tokens_by_model else "claude-opus-5-5"

    return {
        "totalInputTokens": total_in,
        "totalOutputTokens": total_out,
        "totalTokens": total_in + total_out,
        "modelUsed": dominant_model,
        "estimatedCostUsd": round(total_cost, 4),
        "stageModelBreakdown": breakdown,
    }


def main():
    if not EVIDENCE_ROOT.exists():
        print(f"Evidence root not found: {EVIDENCE_ROOT}")
        sys.exit(1)

    token = get_token()
    print(f"Port authenticated. Scanning {EVIDENCE_ROOT} ...\n")

    updated = 0
    skipped = 0

    for run_dir in sorted(EVIDENCE_ROOT.iterdir()):
        if not run_dir.is_dir():
            continue

        run_id = run_dir.name
        metrics = process_run(run_dir)

        if not metrics:
            print(f"  skip {run_id[:8]} — no artifact data")
            skipped += 1
            continue

        ok = upsert_entity(token, "factoryRun", run_id, metrics)
        icon = "✅" if ok else "❌"
        print(
            f"  {icon} {run_id[:8]}  "
            f"model={metrics['modelUsed']:22s}  "
            f"tokens={metrics['totalTokens']:>8,}  "
            f"cost=${metrics['estimatedCostUsd']:.2f}"
        )
        if ok:
            updated += 1

    print(f"\n{updated} entities updated, {skipped} skipped.")
    print("\nNote: pricing from packages/claude-executor/src/index.ts MODEL_PRICING")
    print("  claude-opus-5-5:   $15.00/$75.00 per million tokens")
    print("  claude-sonnet-5-5: $ 3.00/$15.00 per million tokens")
    print("  claude-haiku-5-5:  $ 0.25/$ 1.25 per million tokens")


if __name__ == "__main__":
    main()
