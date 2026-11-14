# Evidence Directory

This directory contains **factory run evidence** — real artifacts produced by or verified during factory stage execution.

## Format

Each factory run stores evidence under `evidence/runs/{run-id}/`:

```
evidence/runs/{run-id}/
  stage-artifacts/
    product-requirements/
      product-spec.md        ← produced by Factory 1
      acceptance.yaml
      work-items.json
    software-architecture/
      adr-0007-invoice-export.md   ← produced by Factory 2
      openapi.yaml
      architecture-evidence.json
    software-engineering/
      execution-manifest.json  ← produced by Factory 3
      test-results.json
    security-compliance/
      security-findings.json   ← produced by Factory 4
      scan-evidence.json
    platform-operations/
      deployment.json          ← produced by Factory 5
      health-evidence.json
  factory-run-summary.json
```

## Reference Run: `run-demo-invoice-export-001`

The reference run for the billing API invoice export WorkOrder.

**Key evidence items:**
- Engineering stage PR: `https://github.com/Darshitpandya/factory-reference-billing-api/pull/2`
- Attempt 1 SHA: `c93d20e73638569e7aa37000f5d0eb63c3989013` → `factory-contract/acceptance: FAILURE`
- Attempt 2 SHA: `fdbbdd0e1f11e9179a316a3f34aaf9695eab5313` → `factory-contract/acceptance: SUCCESS`
- Verifier: `https://web-production-fff93264.up.railway.app`

## Capturing Evidence

```bash
# Verify evidence bundle for a completed run
pnpm factory evidence:verify --run-id <id>

# Capture and package evidence after a run
pnpm exec tsx scripts/capture-evidence.ts --run-id <id>
```

## Note on synthetic fixtures

Files under `evidence/fixtures/` are explicitly labeled synthetic test fixtures.
Files under `evidence/runs/` contain only real execution evidence.
Do not place invented results in `evidence/runs/`.
