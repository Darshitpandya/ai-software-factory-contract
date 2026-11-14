# Security Review — wo-notification-schema-001

- Run ID: 92b970ee-c073-4d80-9053-40937cbbdb98
- Stage: security-compliance
- Work order: Notification Event Schema — Add account.reactivated
- Scope: Add `account.reactivated` event type to the notification contract (non-breaking addition)
- Release version: 1.4.0
- Status: **PRODUCED (proposal only). Not accepted. Review is INCOMPLETE because required inputs are missing.**

## 1. Inputs verified

The workspace contains only `work-order.json` and `README.md`. The following required inputs were **not present**, so I could not verify them:

| Required input | Status |
|---|---|
| Candidate PR / commit diff | Missing |
| Repository base SHA and source commit SHA | Missing |
| Input artifact SHA-256 | Missing |
| Scanner results (SAST, dependency, secrets) and scanner version | Missing |
| Trusted security policy and digest | Missing |
| Service classification (`targetService` is empty in the work order) | Missing |
| FactoryRelease digest for 1.4.0 | Not provided; only the version string is known |

I did not run `verify-security.ts` or `pnpm factory registry:verify`. The workspace has no repository checkout, and I have no allowlisted command for them here. I have no exit codes, tool versions or evidence URIs to report, and I have not invented any.

## 2. Findings

No scanner findings were available, so this review reports **no scanner-derived findings**. This does not mean the change is clean. It means the change has not been scanned or reviewed against a diff. Machine-readable finding IDs, file and line references and severities cannot be produced without the diff and the scanner output.

## 3. Scope-level risk analysis (advisory only, not diff-based)

These notes come from the work order description alone. Each one must be confirmed against the actual diff.

1. **Tenant isolation.** The new event type must carry the same tenant identifier fields and scoping as existing account events. It must not add a path that lets one tenant's reactivation event reach another tenant's subscribers. Not verified.
2. **PII exposure.** Account reactivation payloads may include email, name or account status history. The schema should include only the fields the other `account.*` events already include, and it should not add free-form fields. Not verified.
3. **Backward compatibility.** The addition is described as non-breaking. This requires that:
   - the enum or union is extended only,
   - no existing field changes from optional to required,
   - existing consumers tolerate unknown event types.
   Not verified.
4. **Secrets.** Schema changes should not touch secrets. The diff must be checked for embedded tokens or credentials in fixtures and examples. Not verified.
5. **Dependencies.** A schema-only change should not alter the lockfile. Any dependency or lockfile change would be out of scope and would need review. Not verified.
6. **Authorization semantics.** Reactivation is a privileged state transition. Producer-side authorization and audit logging for it are outside this schema change. Reviewers should confirm that only authorized services can emit the event.

## 4. Remediation / patch

No vulnerability was identified, so I made no patch and opened no patch PR. I did not apply the vulnerability-remediation skill.

## 5. Recommendation

**Do not accept this stage yet.** Escalate to the designated security authority to supply:

1. the candidate PR and source SHA,
2. verified scanner results with tool versions,
3. the trusted policy and service classification (`targetService` is empty),
4. the FactoryRelease digest.

Then re-run this stage. Final disposition belongs to the independent verifier or an authorized human. This document does not approve any exception, dismiss any finding or certify compliance.
