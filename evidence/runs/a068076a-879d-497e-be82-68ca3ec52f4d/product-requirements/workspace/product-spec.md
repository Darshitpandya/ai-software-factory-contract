# Product Specification — Tenant-Scoped Invoice Export

- Work order: wo-billing-invoice-export-001
- Run ID: a068076a-879d-497e-be82-68ca3ec52f4d
- Stage: product-requirements
- Factory release: 1.4.0
- Requested by: billing-domain
- Status: PRODUCED (proposal only; not ACCEPTED). **Human decisions outstanding: see section 8.**

## 0. Provenance and verification status

| Check | Result |
|---|---|
| Source of requirements | `work-order.json` (the only context available in this workspace) |
| `targetService` | **EMPTY in the WorkOrder. It could not be verified against Port.** |
| Service owner | **Not resolvable. No Port context was available, and no owner is invented here.** |
| Input artifact SHA-256 / repo base SHA / FactoryRelease digest | Not provided in the workspace, so not verified |
| `verify-requirements.ts` | Run once. It failed with `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE` because the workspace has no package and no verifier. **No verifier result exists.** |

Because the target service and owner are missing, this spec is a draft proposal. Its status is WAITING_FOR_HUMAN until the questions in section 8 are answered.

## 1. Summary

The billing domain wants an HTTP endpoint that exports invoices as CSV. The export is limited to the caller's tenant, and cells are protected against CSV formula injection. The WorkOrder scope is one sentence. Details beyond it are marked as unresolved decisions rather than assumed.

## 2. Personas (inferred from the scope, to be confirmed)

- **Tenant billing user**: exports their own tenant's invoices.
- **API client or integrator**: calls the endpoint programmatically. This persona is inferred from "endpoint" and needs confirmation.
- **Spreadsheet consumer**: opens the CSV in Excel, Sheets or LibreOffice. This is the formula-injection victim.

## 3. Current vs. desired behavior

- Current: not stated in the WorkOrder (see D-8).
- Desired: an authenticated caller can request a CSV of invoices for their own tenant only. No cell can be interpreted as a spreadsheet formula.

## 4. Requirements

| ID | Requirement | Source |
|---|---|---|
| REQ-001 | The system SHALL provide an endpoint that returns invoices as CSV (`text/csv`). | WO scope: "CSV invoice export endpoint" |
| REQ-002 | **Tenant isolation.** An export SHALL contain only invoices belonging to the tenant of the authenticated caller. The tenant SHALL be derived from the authenticated identity, never from a client-supplied tenant identifier that could select another tenant. | WO scope: "tenant-scoped" |
| REQ-003 | **Authorization.** Unauthenticated requests SHALL be rejected (401). Authenticated callers without export permission SHALL be rejected (403). The permission name or role is TBD (D-3). | Derived from REQ-002 |
| REQ-004 | **Formula-injection protection.** Any cell whose value starts with `=`, `+`, `-`, `@`, TAB (0x09) or CR (0x0D) SHALL be neutralized, so that spreadsheet software treats it as text. The mitigation is TBD (D-4). The protection SHALL apply to every text field, including customer names, descriptions and memo fields. | WO scope: "formula injection protection" |
| REQ-005 | **CSV formatting.** The output SHALL be valid CSV per RFC 4180. Fields containing commas, quotes or newlines SHALL be quoted, and embedded quotes SHALL be doubled. The output SHALL have a header row with a fixed, documented column order and a stable encoding (UTF-8, encoding details per D-5). | Derived from REQ-001 |
| REQ-006 | **Export bounds.** The export SHALL enforce a maximum size or row limit, and requests above the limit SHALL fail with a defined error rather than being truncated silently. Limit values are TBD (D-2). | Derived: limits and error paths |
| REQ-007 | **API compatibility.** The change SHALL be additive. Existing endpoints, schemas and clients SHALL be unchanged. The endpoint SHALL be documented in the service's API specification, and a compatibility check SHALL pass. | Derived: backward compatibility |
| REQ-008 | **Error paths.** Invalid parameters SHALL return 400, a size-limit breach a defined 4xx/413-class error, and unexpected failures 5xx. No error response SHALL include data from another tenant. | Derived |
| REQ-009 | **Auditability.** Each export request SHALL be logged with tenant, actor and outcome, without writing invoice contents to logs. Whether an audit trail is required is TBD (D-6). | Derived. This is a candidate requirement and needs confirmation. |

## 5. Scope

In scope: one tenant-scoped CSV invoice export endpoint, tenant authorization, CSV formatting, formula-injection neutralization, export bounds, error responses, and API documentation and compatibility.

## 6. Out of scope

- Export formats other than CSV (PDF, XLSX, JSON)
- Cross-tenant or admin-wide exports
- Asynchronous or emailed exports, unless D-2 decides otherwise
- Changes to invoice data models or billing calculations
- UI changes, unless confirmed

## 7. Non-functional constraints

- Security: tenant isolation and formula-injection protection are mandatory, and each has an independent negative test.
- Performance and streaming limits are TBD (D-2).
- Compatibility is additive only (REQ-007).
- Sensitive data: invoice contents must not be logged (REQ-009).

## 8. Unresolved decisions (WAITING_FOR_HUMAN)

| ID | Decision | Suggested owner |
|---|---|---|
| D-1 | **`targetService` is empty. Which service hosts this endpoint, and who owns it in Port?** This blocks the stage. | billing-domain / Port catalog owner |
| D-2 | Row and size limits, and the sync or async model | Product plus service owner |
| D-3 | The permission or role that allows export | Product plus security |
| D-4 | The formula-neutralization method. A leading apostrophe or a tab prefix are options. Does the neutralization apply to numeric negative values such as `-12.50`? | Security plus product |
| D-5 | Column set, date and currency formats, and encoding (BOM or not) | Billing domain |
| D-6 | Audit logging requirement | Security and compliance |
| D-7 | Filters (date range, status) and the endpoint path and version | Product plus API owner |
| D-8 | Current behavior, such as an existing export mechanism | Service owner |

## 9. Traceability

Every WorkOrder constraint maps to a requirement. "Tenant-scoped" maps to REQ-002 and REQ-003, "CSV" to REQ-001 and REQ-005, and "formula injection protection" to REQ-004. REQ-006 to REQ-009 are derived and need confirmation. No Port entity or source issue was available to cite.
