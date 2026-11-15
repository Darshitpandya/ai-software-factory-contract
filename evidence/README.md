# Evidence Directory

Real artifacts produced by live factory runs. Every file here was written by Claude during an actual coordinator execution or captured from a real deployment.

**Policy:** `evidence/runs/` contains only real execution evidence — no synthetic data, no fabricated approvals. If a stage was blocked or produced partial output, it is recorded as-is.

---

## Directory Structure

```
evidence/
└── runs/
    └── {run-id}/
        ├── {stage}/
        │   ├── {artifact-id}/
        │   │   └── artifact.json        ← manifest: model used, tokens, SHA-256, status
        │   └── workspace/
        │       ├── work-order.json      ← work order context seeded before Claude ran
        │       ├── README.md            ← workspace README seeded before Claude ran
        │       └── *.md / *.yaml / *.json  ← files Claude produced during the stage
        └── ...
```

Each stage that completed successfully has:
- `{artifact-id}/artifact.json` — machine-readable manifest with `modelUsed`, `tokenUsage`, `sha256`, `producerStatus`, `factoryRelease`
- `workspace/` — the full workspace directory at the time artifacts were captured, including every file Claude wrote

---

## Real Output Files by Stage

| Stage | Files Claude produces |
|-------|----------------------|
| `product-requirements` | `product-spec.md` · `acceptance.yaml` · `work-items.json` |
| `software-architecture` | `architecture.md` · `openapi-delta.yaml` · `adr.md` |
| `software-engineering` | `implementation-notes.md` · `pr-description.md` |
| `security-compliance` | `security-review.md` · `compliance-checklist.md` |
| `platform-operations` | `deployment.json` · `health-evidence.json` · `runbook.md` |

---

## Reference Runs

### `run-billing-invoice-export-live-001`
WorkOrder: `wo-billing-invoice-export-001` — Tenant-Scoped Invoice Export  
Release: 1.4.0 · All 5 stages ACCEPTED

**Engineering stage — the breaking-change demo:**
- PR created: `https://github.com/Darshitpandya/factory-reference-billing-api/pull/2`
- Attempt A SHA: `c93d20e73638569e7aa37000f5d0eb63c3989013` → `factory-contract/acceptance: FAILURE` ❌
- Attempt B SHA: `fdbbdd0e1f11e9179a316a3f34aaf9695eab5313` → `factory-contract/acceptance: SUCCESS` ✅
- oasdiff finding: `required request parameter added: 'tenant_id' in query on GET /v1/invoices`

### `64e3fe0a-0bbc-4e2a-bbef-accebe598748`
WorkOrder: `wo-notification-schema-001` — Notification Event Schema  
Release: 1.4.0 · All 5 stages ACCEPTED · 170,221 tokens · ~$2.08

Workspace artifacts available for all 5 stages. See:
- `64e3fe0a-0bbc-4e2a-bbef-accebe598748/software-architecture/workspace/architecture.md`
- `64e3fe0a-0bbc-4e2a-bbef-accebe598748/security-compliance/workspace/security-review.md`

### `92b970ee-c073-4d80-9053-40937cbbdb98`
WorkOrder: `wo-notification-schema-001` — Notification Event Schema  
Release: 1.4.0 · All 5 stages ACCEPTED · 153,166 tokens · ~$1.95

---

## Artifact Manifest Format

```json
{
  "id": "uuid",
  "runId": "uuid",
  "stage": "software-architecture",
  "producedAt": "2026-11-14T...",
  "files": [
    {
      "path": "architecture.md",
      "sha256": "...",
      "sizeBytes": 4821,
      "mimeType": "text/markdown"
    }
  ],
  "sha256": "bundle-sha256-of-all-files",
  "producerStatus": "PRODUCED",
  "modelUsed": "claude-opus-5-5",
  "factoryRelease": "1.4.0",
  "tokenUsage": {
    "inputTokens": 26340,
    "outputTokens": 7282
  }
}
```

---

## Verifying Evidence Integrity

```bash
# Verify evidence bundle SHA-256 matches recorded artifact manifest
pnpm factory evidence:verify --run-id 64e3fe0a-0bbc-4e2a-bbef-accebe598748
```

---

## Verifier

The independent trusted verifier that posts `factory-contract/acceptance` checks:  
`https://web-production-fff93264.up.railway.app` — health: `/health`

The verifier runs `oasdiff breaking` between the OpenAPI baseline and each PR head SHA. It is independently owned and cannot be influenced by the factory producer.
