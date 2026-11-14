# Architecture Options — Tenant-Scoped Invoice Export (DRAFT, BLOCKED)

| Field | Value |
|---|---|
| Work order | wo-billing-invoice-export-001 |
| Run ID | f8bf711e-4ad4-4cf6-ab0a-39d636be27e8 |
| Stage | software-architecture |
| FactoryRelease | 1.4.0 (digest NOT verified — not available in workspace) |
| Status | **PRODUCED (DRAFT) — stage BLOCKED on missing inputs; not ACCEPTED** |
| Only source used | `work-order.json` (scope: "Add tenant-scoped CSV invoice export endpoint with formula injection protection") |

## 0. Precondition check (procedure step 1) — FAILED

| Required input (AGENTS.md / skills) | Found in workspace? | Effect |
|---|---|---|
| Accepted requirements / product-spec.md with requirement IDs and upstream digest | No | No requirement IDs can be cited; NFRs (latency, max rows/size, retention) unknown |
| Current service graph | No | `targetService` is empty in the work order; owning service and dependency boundary are **unknown** (an AGENTS.md stop-and-escalate condition) |
| Baseline OpenAPI at protected base SHA | No | Cannot preserve/diff existing endpoints; oasdiff breaking check not run |
| Existing ADR history | No | ADR number and prior decisions cannot be verified |
| Repository base SHA, input SHA-256, FactoryRelease digest | No | Provenance unverified |
| Verifier `verify-architecture.ts` | Run attempted, exit nonzero: `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE` (no package in workspace) | No verification evidence exists |
| `pnpm factory registry:verify` | Run attempted, exit nonzero: `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` | No registry evidence exists |

Additional mismatch: AGENTS.md declares outputs `adr-0007-invoice-export.md`, `openapi.yaml`, `architecture-evidence.json`; this run requested `architecture.md`, `openapi-delta.yaml`, `adr.md`. The output contract needs to be reconciled by the domain owner.

Everything below is a **proposal derived from the work-order scope only**. Items marked *ASSUMPTION* need confirmation against the missing sources.

## 1. Hard constraints (from work-order scope)

- **HC-1 Tenant scope:** export must return only invoices of the caller's tenant.
- **HC-2 CSV format:** output is CSV.
- **HC-3 Formula injection protection:** cell values must not be interpreted as spreadsheet formulas (CWE-1236).
- **HC-4 Compatibility (factory rule):** existing endpoints (e.g. `GET /v1/invoices`, named in the openapi-contract skill's negative fixture) must not change parameters or responses — specifically, no new required `tenant_id` query param.

## 2. Assumptions requiring confirmation

- *A-1:* Tenant identity is available from the authenticated principal (token claim) at the API gateway/service. Unverified — no service graph.
- *A-2:* An invoice listing capability with filters (date range, status) already exists in the billing service. Unverified — no baseline OpenAPI.
- *A-3:* Export volumes can exceed what fits in one HTTP request timeout for large tenants. Unknown — no NFRs.

## 3. Alternatives

### Option A — Synchronous streaming export
`GET /v1/invoices/export?from=&to=&status=` returns `text/csv` streamed.

| Dimension | Assessment |
|---|---|
| Tenancy | Tenant from auth context; query filter injected server-side. Simple. |
| Compatibility | Additive new path; no change to `GET /v1/invoices`. |
| Failure handling | Mid-stream failures yield truncated files with 200 already sent; client cannot easily detect. Needs a hard row cap + 413/422 over-limit response. |
| Operational burden | Low: no job store, no object storage. Long-lived connections hold DB cursors/workers. |
| Rollback | Cheap: remove route / feature flag. |

### Option B — Asynchronous export job
`POST /v1/invoice-exports` → `202` + job id; `GET /v1/invoice-exports/{exportId}` for status; `GET /v1/invoice-exports/{exportId}/file` for download (or short-lived signed URL).

| Dimension | Assessment |
|---|---|
| Tenancy | Tenant from auth context stamped on job record; every status/download lookup must check job.tenant == caller.tenant (return 404 otherwise to avoid enumeration). Stored files must be tenant-partitioned. |
| Compatibility | Additive new paths only. |
| Failure handling | Explicit job states (`PENDING/RUNNING/SUCCEEDED/FAILED/EXPIRED`); retryable; complete-or-nothing file. |
| Operational burden | Higher: job queue/worker, object storage, retention/expiry, signed-URL handling (stored exports are sensitive financial data at rest). |
| Rollback | Moderate: disable creation endpoint by flag; drain/expire jobs; purge stored files. |

### Option C (rejected) — Add `format=csv` to existing `GET /v1/invoices`
Rejected: overloads an existing endpoint's response contract (content negotiation changes existing consumer behaviour and pagination semantics); risks violating HC-4.

### Option D (rejected) — Client-side CSV generation from the JSON list API
Rejected: formula injection protection (HC-3) would depend on every client; no server-side guarantee.

## 4. Cross-cutting design (applies to A or B)

**Tenant boundary.** Tenant is never accepted from query/body; derived from authenticated principal. Repository query always includes tenant predicate. Cross-tenant job ids return 404.

**Formula injection protection (HC-3).** CSV writer applied to every cell:
1. If the value begins with `=`, `+`, `-`, `@`, TAB (0x09) or CR (0x0D), prefix with a single quote `'`.
2. Then apply RFC 4180 quoting (wrap in `"`, double inner `"`) for values containing `,`, `"`, CR, LF — *recommend quoting all fields*.
3. Numeric amounts emitted from typed decimal fields (not user strings) so legitimate negatives are not mangled; *open question* for product owner: whether negative amounts in typed numeric columns are exempt from rule 1 (recommended: yes, only free-text columns are escaped).
4. UTF-8 output; BOM inclusion is an open product question.
Unit fixtures must cover each trigger character, embedded quotes/newlines, and negative numeric amounts.

**Limits.** Max date range and max row count enforced; over-limit request → `422` (A) or rejection at job creation (B). Concrete values unknown (no NFRs).

**Authorization.** Requires an export permission/scope (*name TBD against existing auth model*). Unauthenticated → 401; lacking permission → 403.

**Audit.** Log tenant, principal, filters, row count; never log CSV contents.

## 5. Recommendation (proposal — requires architecture-owner decision)

**Option B (asynchronous job)** is provisionally recommended because it gives complete-or-nothing files and does not depend on request-timeout sizing, which is unknown (A-3). **If accepted NFRs bound exports to a small size, Option A is cheaper and should be preferred.** This sync-vs-async choice is a **high-impact unresolved decision flagged for the designated software-architecture owner**; it cannot be settled without the accepted requirements.

The accompanying `openapi-delta.yaml` describes Option B as an additive delta only.

## 6. Required to unblock

1. Provide accepted requirements with IDs + digest (NFRs: max rows, latency, retention, columns).
2. Set `targetService` and provide the service graph.
3. Provide baseline OpenAPI at protected base SHA; run oasdiff `breaking` on the merged spec.
4. Provide ADR history to confirm ADR numbering.
5. Provide a workspace with the verifier package so `verify-architecture.ts` can execute; record its real exit code.
6. Reconcile declared output filenames.
