# Security Review — Tenant-Scoped Invoice Export

- Work order: wo-billing-invoice-export-001
- Run ID: f8bf711e-4ad4-4cf6-ab0a-39d636be27e8
- Stage: security-compliance
- Release: 1.4.0
- Status: **PRODUCED (proposal only). Not accepted. Review is INCOMPLETE because required inputs are missing.**

## 1. Input verification

| Required input | State in workspace | Result |
|---|---|---|
| Candidate PR / commit SHA | Not present | MISSING |
| Verified scanner results (SAST, dependency, secrets) | Not present | MISSING |
| Trusted security policy and service classification | Not present. `targetService` is empty in work-order.json | MISSING |
| Input artifact SHA-256 and FactoryRelease digest | No artifacts to hash | CANNOT VERIFY |
| `verify-security.ts` run | Not run. The workspace contains only work-order.json and README.md, so there is no candidate to validate. | NOT RUN |

I did not invent scanner results, a commit SHA, findings or test results. No finding below is a scanner finding. The items are **review requirements** derived from the work-order scope. Each must be confirmed against the actual code and scanner output.

## 2. Findings

There are no confirmed findings, because no scanner output or source was supplied. This does **not** mean the code is clean.

## 3. Security requirements for review (derived from scope)

Each requirement stays **UNVERIFIED** until evidence is provided.

### SR-1 Tenant isolation (priority: critical)
- The tenant identifier must come from the authenticated principal or token claims. It must never come from a client-supplied query, body or header parameter.
- Every invoice query must filter by tenant, ideally enforced at the data layer (row-level security or a mandatory repository-level tenant predicate).
- Requests for another tenant's invoice IDs or date ranges must return no data, with 403 or 404 behaviour that does not reveal whether the resource exists.
- Pagination, streaming and background-job paths must carry the tenant context.
- Cached or pre-generated export files must be keyed by tenant. Download links must be tenant-bound and short-lived.
- A negative test is required: tenant A cannot export tenant B's data.
- Status: UNVERIFIED.

### SR-2 CSV formula injection protection (priority: high)
- Cells that begin with `=`, `+`, `-`, `@`, TAB (0x09) or CR (0x0D) must be neutralised. The usual method is a leading single quote, or a prefix that makes the cell text.
- Check leading whitespace and control characters before the trigger characters.
- Apply the protection to all user-controlled fields: customer name, description, line-item memo, address, notes and PO number.
- Apply RFC 4180 quoting and escaping for commas, quotes and newlines.
- Neutralise the cell before CSV quoting, and make sure quoting does not undo it.
- Tests are required for payloads such as `=HYPERLINK(...)`, `+cmd|' /C calc'!A0`, `@SUM(1+1)`, `-2+3`, and TAB- or CR-prefixed variants.
- Numeric fields must be generated from typed values, not strings. Negative amounts must not be broken by the sanitiser (a decision is needed: a typed numeric column is exempt, a text column is not).
- Status: UNVERIFIED.

### SR-3 Authentication and authorisation (priority: high)
- The endpoint must require authentication and a specific permission, for example `invoice:export`. Billing roles only.
- Authorisation decisions must be server-side and tested for deny-by-default.
- Status: UNVERIFIED.

### SR-4 PII and data minimisation (priority: high)
- Exported columns must be an explicit allowlist. Do not serialise whole entities.
- Payment instrument data must not appear in the export (PAN, bank account numbers, tokens). Tax IDs and addresses need a classification decision.
- Logs must not contain exported row contents or PII.
- Responses should use `Content-Type: text/csv`, `Content-Disposition: attachment` with a server-generated filename, and `Cache-Control: no-store`. Also set `X-Content-Type-Options: nosniff`.
- Status: UNVERIFIED.

### SR-5 Abuse resistance (priority: medium)
- Rate limit per tenant and per user.
- Enforce a maximum row count or date range, and use streaming or asynchronous generation for large exports so memory use is bounded.
- Validate filter parameters (dates, enum values, IDs) with strict schemas.
- Status: UNVERIFIED.

### SR-6 Auditability (priority: medium)
- Record an audit event for each export: actor, tenant, filter, row count, timestamp and request ID. The event must not contain the data itself.
- Status: UNVERIFIED.

### SR-7 Secrets and dependencies (priority: medium)
- No secrets in the diff or test fixtures.
- Any new CSV library must be reviewed for known advisories and licence. Prefer existing approved dependencies.
- Lockfile changes must be scanned.
- Status: UNVERIFIED.

## 4. Remediation and patch

No patch PR was produced. The vulnerability-remediation skill needs a verified finding, an affected dependency and an approved source SHA, and none of these exist.

## 5. Recommended next actions

1. The billing domain owner or Port resolves `targetService` and the service classification.
2. Provide the candidate PR or commit SHA, the verified scanner results with tool versions, and the trusted policy reference.
3. Re-run this stage. Execute `pnpm exec tsx factories/security-compliance/scripts/verify-security.ts` and record the real exit code.
4. Send any exception or false-positive proposal to the designated security authority. This review approves none.

## 6. Disposition proposal

**BLOCKED / INCOMPLETE.** The review is not complete and no security conclusion can be given. The decision belongs to the independent verifier or the designated human security owner.
