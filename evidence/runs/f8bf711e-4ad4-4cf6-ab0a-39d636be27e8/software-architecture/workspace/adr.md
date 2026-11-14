# ADR (number TBD, proposed 0007): Tenant-Scoped CSV Invoice Export

- **Status:** Proposed — DRAFT. Not approved. Approval reserved for the designated software-architecture owner.
- **Work order:** wo-billing-invoice-export-001 (requested by billing-domain, release 1.4.0)
- **Run:** f8bf711e-4ad4-4cf6-ab0a-39d636be27e8
- **Requirement IDs:** NONE AVAILABLE — accepted requirements were not provided to this stage. This ADR cannot pass the "referenced requirements exist" check until they are.
- **Source revision:** UNKNOWN — no repository base SHA, baseline OpenAPI, service graph or ADR history in workspace.
- **Verification:** `verify-architecture.ts` attempted, exit nonzero (`ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`); `pnpm factory registry:verify` exit nonzero (`ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`). No passing evidence.

## Context
Billing tenants need to export their invoices as CSV. Exports contain financial data and must be strictly limited to the caller's tenant. CSV files are commonly opened in spreadsheet software, so values starting with formula trigger characters can execute as formulas (CSV/formula injection, CWE-1236). The owning service is not specified (`targetService` empty) and NFRs (volume, latency, retention) are unknown.

## Decision (proposed)
1. Add new, additive endpoints for export; **do not modify** `GET /v1/invoices` or any existing endpoint.
2. Derive tenant exclusively from the authenticated principal; reject/ignore any client-supplied tenant; cross-tenant resource access returns 404.
3. Server-side CSV encoder: prefix free-text cells beginning with `=`, `+`, `-`, `@`, TAB or CR with `'`; RFC 4180 quote all fields; typed numeric columns emitted from decimals.
4. Provisionally use an **asynchronous export job** (`POST /v1/invoice-exports`, status and file download sub-resources), per `openapi-delta.yaml`. **Sync vs async is flagged as an unresolved high-impact choice for owner decision** once NFRs are available.
5. Enforce date-range/row limits (422 over-limit), export permission (401/403), rate limiting (429), and audit logging without CSV content.

## Alternatives considered
- **Synchronous streaming `GET /v1/invoices/export`** — simpler, cheaper to roll back; rejected provisionally due to truncation risk and unknown volume. Preferred if NFRs cap export size low.
- **`format=csv` on existing `GET /v1/invoices`** — rejected: changes existing endpoint behaviour for consumers.
- **Client-side CSV generation** — rejected: no server-side guarantee of formula injection protection.

## Consequences
- **Existing API consumers:** no change; all endpoints are new. Must be confirmed with oasdiff `breaking` against protected baseline (NOT yet run).
- **Data handling:** generated files are tenant financial data at rest; need tenant-partitioned storage, encryption at rest, short retention/expiry and purge. Exported text cells beginning with trigger characters will show a leading `'` — a visible, intentional data alteration that consumers re-importing the CSV must be aware of.
- **Deployment:** requires a job worker and object storage (async option); feature flag on job creation endpoint.
- **Operational:** job monitoring, failure alerting, storage cost.

## Rollback
Disable `POST /v1/invoice-exports` via feature flag; let in-flight jobs finish or mark FAILED; expire and purge stored files; remove routes in a later release. No existing contract to restore since changes are additive.

## Open items before this ADR can be reviewed
- Accepted requirement IDs and digest; NFRs.
- Target service and service graph (dependency boundary currently unknown — escalation condition).
- Baseline OpenAPI + oasdiff results; ADR numbering confirmation.
- Permission/scope name and security scheme alignment with baseline.
- Product decisions: negative-number handling in escaping, UTF-8 BOM, column set.
- Reconcile output filenames with AGENTS.md (`adr-0007-invoice-export.md`, `openapi.yaml`, `architecture-evidence.json`).
