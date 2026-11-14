# Compliance Checklist — wo-notification-schema-001

- Run ID: 64e3fe0a-0bbc-4e2a-bbef-accebe598748
- Stage: security-compliance
- Release: 1.4.0
- Status: **PRODUCED — proposal. This is not a certification, and nothing is ACCEPTED.**

Legend: PASSED / FAILED / N-A / HUMAN-EXCEPTION / NOT EVIDENCED (no evidence available, so no verdict).
No control IDs were supplied in the workspace, so none are invented. Controls are listed by name only.

| # | Control | Verdict | Evidence |
|---|---|---|---|
| 1 | Input artifact SHA-256 verified | NOT EVIDENCED | No artifact or hash supplied |
| 2 | Repository base SHA verified | NOT EVIDENCED | None supplied |
| 3 | FactoryRelease digest verified | NOT EVIDENCED | Only the version "1.4.0" is present |
| 4 | Candidate commit SHA recorded | NOT EVIDENCED | No PR or commit supplied |
| 5 | Scanner verified and version recorded | NOT EVIDENCED | No scanner results supplied |
| 6 | Secrets scan | NOT EVIDENCED | Not run |
| 7 | Dependency / lockfile change review | NOT EVIDENCED | No diff available. A schema-only change is expected to have none. |
| 8 | PII exposure review of the new payload | NOT EVIDENCED | Payload definition not supplied |
| 9 | Tenant-isolation review and test results | NOT EVIDENCED | No test reports supplied |
| 10 | Consumer backward-compatibility (unknown event type tolerance) | NOT EVIDENCED | Needs a consumer check |
| 11 | Trusted policy and service classification applied | NOT EVIDENCED | `targetService` empty and no policy supplied |
| 12 | `verify-security.ts` executed, exit code recorded | NOT EVIDENCED | Not run because no repository or inputs are available |
| 13 | `registry:verify` executed | NOT EVIDENCED | Not run |
| 14 | Exceptions / false-positive dismissals | N-A | None proposed or approved. None are self-issued. |
| 15 | Final disposition by designated security authority | PENDING | Human or independent verifier owns this |

## Summary
- Passed: 0
- Failed: 0
- Not evidenced: 13
- Not applicable: 1
- Pending human decision: 1

## Blocking gaps
1. There is no candidate PR or commit, no SHAs or digests, and no scanner results.
2. There is no policy or service classification, and `targetService` is empty.
3. No deterministic verifier has been run.

## Required before acceptance
Provide the missing inputs above and re-run the stage. Run the fixed verifier and record the real exit code, tool version and evidence URI. Then escalate to the designated security authority, whose identity must be resolved from Port.
