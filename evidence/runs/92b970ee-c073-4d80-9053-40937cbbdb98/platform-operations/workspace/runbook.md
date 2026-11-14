# Runbook: wo-notification-schema-001 — Add account.reactivated

Run ID: 92b970ee-c073-4d80-9053-40937cbbdb98
Stage: platform-operations
Factory release: 1.4.0
Status: BLOCKED (PRODUCED-BLOCKED, not ACCEPTED)

## 1. Scope
Add the `account.reactivated` event type to the notification event contract as a non-breaking addition. The stage's job is to plan and verify its deployment, which needs a target, an accepted artifact, and approvals.

## 2. Current state
- No deployment has been performed.
- `targetService` is empty in the work order.
- No accepted artifact SHA-256, repository base SHA, or FactoryRelease digest was supplied.
- No known-good rollback digest is available.
- No deployment approval exists.
- `verify-deployment.ts` exited nonzero (`ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`), so the validator did not pass.

## 3. Blocking items (must be resolved before re-running this stage)
| # | Item | Owner |
|---|------|-------|
| B1 | Declare `targetService` (test service and environment) | notifications-domain |
| B2 | Provide accepted upstream artifact SHA-256, repository base SHA, and release digest | notifications-domain / release owner |
| B3 | Provide known-good image digest for rollback | platform-operations |
| B4 | Obtain deployment approval from an authenticated designated human | platform-operations domain owner |
| B5 | Make the validator runnable in the sandbox (package/workspace configuration) and re-run `verify-deployment.ts` | platform-operations |
| B6 | Supply SLO thresholds and telemetry source access (read-only) | platform-operations |

## 4. Deployment procedure (to execute only after B1–B6 are cleared)
1. Confirm the artifact SHA-256 and repository base SHA match the accepted release.
2. Confirm the known-good digest and rollback target.
3. Run the trusted deployment workflow with approved credentials. Do not run it from this stage.
4. Roll out to the approved test environment within the approved window.
5. Run smoke and health checks, then record real observations in `health-evidence.json`.
6. Run `pnpm exec tsx factories/platform-operations/scripts/verify-deployment.ts` and record its exit code and evidence URI.

## 5. Rollback procedure (if health fails after deployment)
1. Trigger: any smoke/readiness failure, or SLO breach against thresholds supplied in B6.
2. Roll back to the known-good digest from B3 using the trusted workflow.
3. Require fresh health evidence after rollback.
4. Record the incident and link it to this work order.
Rollback is not possible until B3 is resolved.

## 6. Escalation
Stop and escalate if any of the following occur: a deployment without approval, missing health observations, no rollback target, or an unauthorized production write. Do not modify the protected verifier, release pointer, policy, or credentials.

## 7. Authority
This runbook is a proposal. Only the protected external validator or an authenticated designated human can mark the handoff ACCEPTED.
