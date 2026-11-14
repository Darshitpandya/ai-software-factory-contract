# Operational Runbook: Notification Event Schema — Add `account.reactivated`

- Work order: `wo-notification-schema-001`
- Run ID: `64e3fe0a-0bbc-4e2a-bbef-accebe598748`
- Release: 1.4.0 (FactoryRelease 1.4.0)
- Status: PRODUCED, NOT ACCEPTED
- Requested by: notifications-domain

> This runbook is operational documentation. It does not record a live deployment. Items marked UNRESOLVED must be supplied by the owning domain before execution.

## 1. Scope

This change adds the `account.reactivated` event type to the notification event contract. It is a backward-compatible, additive schema change. Existing event types and consumers are not modified.

## 2. Preconditions (must all be true before any rollout)

1. `targetService` is set in the work order. It is currently empty and is UNRESOLVED.
2. The accepted source revision (repository base SHA) and input artifact SHA-256 are recorded and verified.
3. The FactoryRelease 1.4.0 digest is verified.
4. An immutable image digest is supplied for any runtime component. Mutable tags are not permitted.
5. A known-good rollback digest is identified and verified. Without it, rollback is blocked.
6. The platform-operations owner is resolved from Port. It is not invented.
7. Approved SLO and smoke thresholds are supplied. Do not use guessed values.
8. A deployment window and a designated human approval are recorded.

If any precondition is missing, stop and escalate. Do not proceed on assumptions.

## 3. Startup / Activation procedure (test environment)

1. Confirm all preconditions in section 2.
2. Confirm the schema change passes the contract compatibility check (HC-003) in the pipeline.
3. Publish the updated notification event schema version to the schema registry for the test environment. Use the trusted deployment workflow only.
4. Deploy the target service at the immutable digest through the trusted workflow. Use the staged rollout defined in `deployment.json`.
5. Wait for readiness (HC-001) within the rollout timeout.
6. Run the synthetic publish/consume check (HC-004).
7. Scan consumer logs for new schema-validation errors (HC-006).
8. Record each check result with timestamp, source ID and evidence URI in `health-evidence.json`.
9. Do not promote beyond test without a designated human approval.

## 4. Shutdown / Deactivation procedure

The schema addition is not a long-running service. Deactivation means removing the event from production use:

1. Stop producers from emitting `account.reactivated` by reverting the producer change through the trusted workflow.
2. Keep the schema entry in the registry. Removing a published event type can break consumers that already parse it.
3. Confirm no new `account.reactivated` events are emitted (observe the event topic).
4. Record the action and time in the incident or change record.

## 5. Rollback procedure

Trigger rollback if any of the following occur:

- Readiness (HC-001) fails after the rollout timeout.
- Compatibility check (HC-003) reports any breaking change.
- Synthetic publish/consume (HC-004) fails or produces DLQ entries.
- Consumer logs show new schema-validation errors (HC-006).
- Error rate breaches the approved SLO (HC-005).

Steps:

1. Stop the rollout. Do not start further stages.
2. Confirm the known-good target: the exact previous immutable digest and revision. If it is not identified, rollback is BLOCKED. Escalate immediately.
3. Redeploy the known-good digest through the trusted deployment workflow only. Do not use manual overrides or unapproved credentials.
4. Revert the schema-registry publication for `account.reactivated` only if no consumer has begun relying on it. Otherwise escalate to the schema owner.
5. Rerun all health checks (HC-001 to HC-006) against fresh observations. Old results do not count.
6. Open an incident record linking this work order, the failing check IDs and the rollback action.
7. Hand off to the designated human for approval to resume or to create a remediation WorkOrder.

## 6. Verification

- Run the project validator for this stage: `pnpm exec tsx factories/platform-operations/scripts/verify-deployment.ts`.
- Record its exit code, tool version and evidence URI. A nonzero exit code means the artifact fails. Do not claim acceptance.
- Run `pnpm factory registry:verify` to check registry consistency.

## 7. Escalation

Escalate to the platform-operations owner (UNRESOLVED, resolve from Port) and to notifications-domain for:

- Missing targetService, digest, known-good target or approval.
- Any health check failing with no clear cause.
- Any unauthorized production write, or any request to bypass the trusted workflow.

## 8. Current status

- Live deployment: not performed.
- Health observations: none recorded. All observed values are null.
- Acceptance: NOT ACCEPTED. Acceptance is reserved for the independent verifier and an authorized designated human.
