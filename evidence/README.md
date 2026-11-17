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
        │   │   └── artifact.json        ← manifest: model used, tokens, SHA-256, producerStatus
        │   └── workspace/
        │       ├── work-order.json      ← work order context seeded before Claude ran
        │       ├── README.md            ← workspace README seeded before Claude ran
        │       └── *.md / *.yaml / *.json  ← files Claude produced during the stage
        └── ...
```

Each stage that completed successfully has:
- `{artifact-id}/artifact.json` — machine-readable manifest
- `workspace/` — every file Claude wrote, plus the seeded context files

---

## On producerStatus: PRODUCED

Every `artifact.json` records `producerStatus: PRODUCED`. This is correct and intentional.

`PRODUCED` is what the stage executor reports: "I have written the output files." It is Claude's honest self-report.

`ACCEPTED` is what the coordinator records in Port and PostgreSQL after it accepts the stage output. These are two separate facts recorded in two separate systems — exactly what the FactoryRun design requires.

The Port entity shows `status: COMPLETED` with stages ACCEPTED. The artifact files show `producerStatus: PRODUCED`. Both are accurate. Neither contradicts the other.

---

## On model assignments

Each stage uses the model specified in `factory-releases/1.4.0/factory-release.yaml` under `stageModels`:

| Stage | Model |
|-------|-------|
| product-requirements | claude-sonnet-5-5 |
| software-architecture | claude-opus-5-5 |
| software-engineering | claude-opus-5-5 |
| security-compliance | claude-sonnet-5-5 |
| platform-operations | claude-haiku-5-5 |

No stage uses a single model for all five. `claude-opus-5-5` is the model for the two most demanding stages (architecture and engineering). The Port entity `modelUsed` field records the dominant model for the highest-value stages.

---

## Reference Run: `64e3fe0a-0bbc-4e2a-bbef-accebe598748`

**The complete reference run.** All five stage workspaces present with real Claude-produced documents.

WorkOrder: `wo-notification-schema-001` — Notification Event Schema update
Release: 1.4.0 · All 5 stages COMPLETED · 170,221 tokens · ~$2.08

| Stage | Model | Key output files |
|-------|-------|-----------------|
| product-requirements | claude-sonnet-5-5 | product-spec.md, acceptance.yaml, work-items.json |
| software-architecture | claude-opus-5-5 | architecture.md, openapi-delta.yaml, adr.md |
| software-engineering | claude-opus-5-5 | implementation-notes.md, pr-description.md |
| security-compliance | claude-sonnet-5-5 | security-review.md, compliance-checklist.md |
| platform-operations | claude-haiku-5-5 | deployment.json, health-evidence.json, runbook.md |

GitHub folder: `evidence/runs/64e3fe0a-0bbc-4e2a-bbef-accebe598748/`

---

## Reference Run: `run-billing-invoice-export-001`

The reference run for the billing API invoice export WorkOrder.

**Engineering stage — the breaking-change demo:**
- PR created: `https://github.com/Darshitpandya/factory-reference-billing-api/pull/2`
- Attempt A SHA: `c93d20e73638569e7aa37000f5d0eb63c3989013` → `factory-contract/acceptance: FAILURE` ❌
- Attempt B SHA: `fdbbdd0e1f11e9179a316a3f34aaf9695eab5313` → `factory-contract/acceptance: SUCCESS` ✅
- oasdiff finding: `required request parameter added: 'tenant_id' in query on GET /v1/invoices`

---

## Verifying Evidence Integrity

```bash
pnpm factory evidence:verify --run-id 64e3fe0a-0bbc-4e2a-bbef-accebe598748
```

---

## On execution: local coordinator, not GitHub Actions

The coordinator in this reference implementation runs locally:

```bash
export $(cat .env | grep -v '#' | xargs)
nohup node_modules/.bin/tsx apps/factory-coordinator/src/index.ts &
```

GitHub Actions (`factory-run.yml`) creates the work order record and Port entity — it does not run the coordinator. The coordinator polls PostgreSQL every 10 seconds and processes PENDING runs wherever it is deployed.

For production use, deploy the coordinator as a persistent process with access to PostgreSQL and the Port + Anthropic APIs. The `infra/local/docker-compose.yaml` and `infra/terraform/` show the full setup.
