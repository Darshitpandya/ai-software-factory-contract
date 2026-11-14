# Implementation Notes — wo-notification-schema-001

**Work order:** wo-notification-schema-001: Notification Event Schema — Add `account.reactivated`
**Run ID:** 92b970ee-c073-4d80-9053-40937cbbdb98
**Stage:** software-engineering
**FactoryRelease:** 1.4.0
**Requested by:** notifications-domain
**Status:** PRODUCED (proposal only). **BLOCKED**: preconditions not met, so no code change was made.

---

## 1. Summary

The work order asks for a non-breaking addition: a new `account.reactivated` event type in the notification contract. I could not implement it in this run because required inputs are missing and the project validator cannot run. This document records:
- what I verified and what was missing,
- the real outputs of the commands I ran, and
- the planned design and test plan to use once the preconditions are met.

I wrote no source code, tests, commit or PR. I am not reporting any test results, because no tests ran.

## 2. Precondition verification (AGENTS.md procedure, step 1)

| Precondition | Expected | Observed | Result |
|---|---|---|---|
| Accepted ADR (with SHA-256 digest) | Present in workspace / handoff | Not provided. Workspace only has `README.md` and `work-order.json` | ❌ Missing |
| Work items / acceptance criterion IDs | Present | Not provided. The work order has only a one-line scope | ❌ Missing |
| Base repository SHA | Pinned commit | Not provided. `git rev-parse HEAD` is not allowlisted | ❌ Unverifiable |
| Target service / repository | Named | `targetService` is `""` (empty) | ❌ Missing |
| Allowed file/path list | Declared | Not provided | ❌ Missing |
| FactoryRelease digest | Digest for 1.4.0 | Only the version string `1.4.0` is present, with no digest | ⚠️ Unverifiable |
| Notification contract source (schema file) | In repo checkout | No repository in the workspace | ❌ Missing |

## 3. Commands executed (real results)

| Command | Exit | Output |
|---|---|---|
| `pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts` | non-zero | `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE  No package found in this workspace` |
| `git rev-parse HEAD` | n/a | Rejected: `Command not in allowlist` |

`pnpm factory registry:verify` was not run. With no package in the workspace, it would fail the same way. The required validator did **not** pass, so under the skill rules this artifact counts as failing/blocked and must not be accepted.

## 4. Planned design (for use once inputs are provided)

These are planned changes, not changes that were made. The real file paths must come from the target repo and the approved path list.

### 4.1 Contract change (additive)
- Add `account.reactivated` to the notification event-type enum/discriminated union. Keep all existing members unchanged.
- Define the payload schema. It should follow the shape of the existing `account.*` lifecycle events (e.g. `account.deactivated`, if present) and include:
  - `eventId` (string, UUID), `eventType` (const `"account.reactivated"`), `occurredAt` (RFC 3339 timestamp), `schemaVersion`
  - `tenantId` (required; keeps tenant scoping), `accountId` (required)
  - `reactivatedBy` (optional actor reference), `reason` (optional string)
- Do not add new required fields to existing events, and do not rename or remove anything.

### 4.2 Compatibility rules (non-breaking)
- Consumers that use exhaustive switches over event types need a default/unknown-event branch. Check this in each consumer, or document it as a consumer-side risk.
- Contract version: bump minor (additive), in line with release 1.4.0.
- If a schema registry is used (Avro/JSON Schema/Protobuf), registry compatibility mode should be BACKWARD or FULL. The compatibility check has to pass before merge.

### 4.3 Test plan (test-driven-change)
Criterion IDs could not be mapped because none were provided. Planned tests:
1. A valid `account.reactivated` payload passes schema validation.
2. A payload missing `tenantId` or `accountId` is rejected.
3. A wrong `eventType` const is rejected.
4. Regression: every existing event fixture still validates unchanged (backward compatibility).
5. Schema-registry compatibility check against the previous contract version passes.
6. Consumer dispatch: an unknown or new event type does not crash consumers that are not yet upgraded.

## 5. Untested criteria
All criteria are untested. No tests were run in this stage.

## 6. Needed to unblock
1. Accepted ADR and work items with SHA-256 digests and acceptance criterion IDs.
2. Target service/repository name and pinned base SHA, checked out into the sandbox workspace.
3. Allowed file/path list for the change.
4. FactoryRelease 1.4.0 digest.
5. A workspace where `verify-engineering.ts` and `pnpm factory registry:verify` can run.

Escalate to the designated software-engineering domain owner (resolve the owner's identity via Port).
