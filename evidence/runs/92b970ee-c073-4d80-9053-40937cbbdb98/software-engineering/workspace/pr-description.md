# [DRAFT — NOT OPENED] feat(notifications): add `account.reactivated` event type

**Work order:** wo-notification-schema-001
**Run ID:** 92b970ee-c073-4d80-9053-40937cbbdb98
**Release:** 1.4.0
**Requested by:** notifications-domain
**Status:** PRODUCED draft, BLOCKED. No commit or PR exists.

> ⚠️ This is a draft PR description only. No source changes were made, no commit was created and no PR was opened. Required inputs are missing (accepted ADR, input digests, target service, base SHA, allowed paths), and the project validator could not run (`ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`). See `implementation-notes.md`.

## What this PR will do
This adds a new `account.reactivated` event type to the notification event contract. It is an additive, non-breaking change.

### Planned changes
- Add `account.reactivated` to the notification event-type enum/union.
- Add a payload schema with:
  - required: `eventId`, `eventType`, `occurredAt`, `schemaVersion`, `tenantId`, `accountId`
  - optional: `reactivatedBy`, `reason`
- Bump the contract minor version (additive change).
- Add fixtures and tests for the new event.

### What will not change
- Existing event types, fields and required-field sets.
- Tenant scoping. `tenantId` stays mandatory on all events, including the new one.

## Compatibility
- Backward compatible: existing producers and consumers keep working unchanged.
- Consumers with exhaustive event switches must handle unknown types gracefully. Reviewers should check this in downstream services.
- A schema-registry compatibility check (BACKWARD/FULL) against the previous version is required before merge.

## Testing
**No tests have been run.** Planned coverage:
- [ ] Valid `account.reactivated` payload validates
- [ ] Missing `tenantId` / `accountId` is rejected
- [ ] Invalid `eventType` const is rejected
- [ ] All existing event fixtures still validate (regression)
- [ ] Registry compatibility check passes
- [ ] Not-yet-upgraded consumers tolerate the new event type

## Verification evidence
| Check | Exit | Evidence |
|---|---|---|
| `pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts` | non-zero | `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE` (no package in workspace) |
| `pnpm factory registry:verify` | not run | Blocked by the same missing workspace |

## Requirement traceability
- Work order scope: "Add account.reactivated event type to notification contract — non-breaking addition"
- ADR ID: **not provided**
- Acceptance criterion IDs: **not provided**

## Approval
This is a proposal only. Acceptance requires the protected external checks or the authenticated designated human reviewer. This stage does not claim approval.
