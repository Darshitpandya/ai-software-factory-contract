# Compliance Checklist — Tenant-Scoped Invoice Export

- Work order: wo-billing-invoice-export-001
- Run ID: f8bf711e-4ad4-4cf6-ab0a-39d636be27e8
- Release: 1.4.0
- Status: **PRODUCED (proposal). Not ACCEPTED. This is not a certification.**

Legend: PASSED, FAILED, N/A, HUMAN-EXCEPTION, **NOT VERIFIED** (no evidence available in this run).
No control is marked PASSED, because no candidate commit, scanner output or test report was provided. Control IDs are not taken from a trusted policy. The "Requirement" column uses the review IDs in security-review.md. The security authority must map them to the official control IDs.

## Evidence provenance

| Item | Value |
|---|---|
| Source commit SHA | NOT PROVIDED |
| Scanner name and version | NOT PROVIDED |
| Policy digest | NOT PROVIDED |
| Input artifact SHA-256 | NOT AVAILABLE (no artifacts) |
| FactoryRelease digest | NOT VERIFIED |
| `verify-security.ts` exit code | NOT RUN |
| Evidence URI | NONE |
| Service classification | NOT PROVIDED (`targetService` is empty) |

## Control status

| # | Requirement | Applicable | Status | Evidence |
|---|---|---|---|---|
| 1 | SR-1 Tenant isolation enforced server-side, with a cross-tenant negative test | Yes | NOT VERIFIED | none |
| 2 | SR-2 CSV formula injection neutralisation (`= + - @ TAB CR`) on all text fields | Yes | NOT VERIFIED | none |
| 3 | SR-2 RFC 4180 escaping, with injection tests passing | Yes | NOT VERIFIED | none |
| 4 | SR-3 Authentication and permission check (deny by default) | Yes | NOT VERIFIED | none |
| 5 | SR-4 Column allowlist; no payment instrument data | Yes | NOT VERIFIED | none |
| 6 | SR-4 Safe response headers (`attachment`, `no-store`, `nosniff`) | Yes | NOT VERIFIED | none |
| 7 | SR-4 No PII in logs | Yes | NOT VERIFIED | none |
| 8 | SR-5 Rate limit and bounded export size | Yes | NOT VERIFIED | none |
| 9 | SR-6 Audit event per export without data content | Yes | NOT VERIFIED | none |
| 10 | SR-7 Secret scan clean | Yes | NOT VERIFIED | none |
| 11 | SR-7 Dependency scan clean and lockfile reviewed | Yes | NOT VERIFIED | none |
| 12 | Scanner provenance verified | Yes | FAILED (precondition) | no scanner output supplied |
| 13 | Exceptions or waivers | None proposed | N/A | no human exception exists |

## Stage gating checks

- [ ] Input artifact SHA-256, repository base SHA and FactoryRelease digest verified
- [ ] Approved Port context resolved (service owner and classification)
- [ ] Scanner results verified and not stale
- [ ] `verify-security.ts` executed, with exit code recorded
- [ ] Evidence bundle (`scan-evidence.json`) matches actual outputs
- [x] No approvals fabricated
- [x] No protected verifier, policy, release pointer or credentials modified
- [x] Status limited to PRODUCED

## Escalation

Escalate to the designated security authority (resolve from Port). The candidate PR, scanner results and service classification are missing. Re-run this stage after they are supplied. Only the independent verifier or an authenticated human owner can accept this handoff.
