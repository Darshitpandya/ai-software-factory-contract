# Security Review — wo-notification-schema-001

- Run ID: 64e3fe0a-0bbc-4e2a-bbef-accebe598748
- Stage: security-compliance
- Work order: Notification Event Schema — Add account.reactivated
- Release version / FactoryRelease: 1.4.0
- Requested by: notifications-domain
- Status: **PRODUCED (proposal only) — INCOMPLETE, preconditions missing. Not accepted; no compliance is claimed.**

## 1. Scope
Add the `account.reactivated` event type to the notification contract. The work order describes this as a non-breaking, additive change.

## 2. Input verification (AGENTS.md procedure step 1)
| Required input | State in workspace | Result |
|---|---|---|
| Candidate PR / commit SHA | Not provided (the workspace has only work-order.json and README.md) | MISSING |
| Input artifact SHA-256 | Not provided | NOT VERIFIED |
| Repository base SHA | Not provided | NOT VERIFIED |
| FactoryRelease digest | Only the version string "1.4.0" is present, with no digest | NOT VERIFIED |
| Scanner findings (verified) | Not provided | MISSING |
| Trusted security policy and service classification | Not provided. `targetService` is empty. | MISSING |

I did not run any scanner. I did not run `verify-security.ts` or `pnpm factory registry:verify`, because the workspace has no repository checkout and I have no source to point them at. No exit code, tool version or evidence URI exists, and I have not invented any.

## 3. Findings
No findings are recorded. This is not a "clean" result. Nothing was available to analyze, so the absence of findings means only that no evidence was reviewed.

- Scanner results: none. No scanner verdict is claimed.
- Critical/high findings: unknown.

## 4. Risk analysis (design-level only, not a substitute for scanning)
These are the review priorities from the security-review skill. Each needs confirmation against the actual diff.

1. **Tenant isolation:** The new event must carry the same tenant identifier and scoping fields as existing events. It must not add a path that bypasses tenant-scoped routing or subscription filters. *Unverified.*
2. **PII exposure:** A reactivation event could carry account or user attributes such as email or name. The payload should be limited to identifiers and the minimum fields needed, in line with the existing notification event conventions. *Unverified.*
3. **Secrets:** The schema change should not contain credentials, tokens or endpoints. *Unverified.*
4. **Dependency changes:** A schema-only addition should not alter the lockfile. Any dependency or lockfile change in the PR needs separate review. *Unverified.*
5. **Backward compatibility:** An additive enum or `oneOf` member is non-breaking only if consumers tolerate unknown event types. Strict-enum consumers could reject the new type. This needs a consumer-compatibility check before release. *Unverified.*
6. **Authorization:** Confirm that which principals may emit or receive `account.reactivated` matches the existing account lifecycle events, for example account.suspended or account.deactivated. *Unverified.*

## 5. Recommended next action
1. Supply the candidate PR and commit SHA, the base SHA, input artifact SHA-256 and FactoryRelease digest.
2. Supply verified scanner results, the trusted policy and the service classification. Set `targetService`.
3. Re-run this stage, then run `pnpm exec tsx factories/security-compliance/scripts/verify-security.ts` and record its real exit code.
4. Send the result to the designated security authority for the final decision. Resolve the owner's identity from Port.

## 6. Authority boundary
This document is a proposal. It contains no approved disposition and no exception. Only the independent verifier or an authenticated designated human can mark this handoff ACCEPTED.
