# [DRAFT — BLOCKED] feat(notifications): add `account.reactivated` event type to notification contract

> **Status: DRAFT / NOT READY FOR REVIEW.** This PR description was prepared ahead of implementation. No code has been committed, and no tests or validators have passed. See "Blockers" below.

- **Work order:** wo-notification-schema-001
- **Run ID:** 64e3fe0a-0bbc-4e2a-bbef-accebe598748
- **Requested by:** notifications-domain
- **Target release:** 1.4.0 (minor, non-breaking)
- **ADR:** _not provided_ (required)
- **Base SHA:** _not provided_ (required)
- **Target service/repo:** _not specified_ (`targetService` is empty)

## Summary

Adds a new `account.reactivated` event type to the notification event contract. Notification consumers can then react when a previously suspended or deactivated account is restored. The change is purely additive: existing event types, fields and consumers are not modified.

## Proposed changes

- Add `account.reactivated` to the notification event-type enum or discriminated union.
- Add a payload schema for `account.reactivated`. The ADR must confirm the fields:
  - required: `eventId`, `eventType` (const), `occurredAt` (RFC 3339), `tenantId`, `accountId`, `schemaVersion`
  - optional: `reactivatedBy`, `previousStatus`
- Bump the contract minor version to match release 1.4.0.
- Add test fixtures and validation tests for the new event.

## Compatibility

- **Backward compatible:** no existing members removed, renamed or reordered, and no new required fields on existing events.
- **Forward compatibility risk:** consumers that switch exhaustively on event type and throw on unknown values could fail when the new type is emitted. These consumers must be identified before any producer emits `account.reactivated`.
- A schema registry compatibility check in BACKWARD mode must pass.

## Test plan (not yet executed)

- [ ] AC-1: a valid `account.reactivated` payload validates
- [ ] AC-2: missing required fields (`tenantId`, `accountId`, `eventId`, `occurredAt`) are rejected
- [ ] AC-3: all existing event fixtures still validate (regression)
- [ ] AC-4: tenant scoping is enforced on the new event
- [ ] AC-5: consumers tolerate an unknown event type
- [ ] AC-6: the registry compatibility check passes against the previous contract version

These criterion IDs are placeholders and will be mapped to the approved acceptance IDs.

## Verification results (actual, this run)

| Check | Exit | Result |
|---|---|---|
| `pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts` | nonzero | `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE` (no package in workspace) |
| `pnpm factory registry:verify` | nonzero | `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` (no package.json) |

## Blockers

1. No accepted ADR or upstream artifact digests were provided.
2. No repository base SHA was provided, and the target service is empty.
3. No repository source is present in the sandbox, so the change cannot be implemented.
4. The deterministic validators exited nonzero because there is no project in the workspace.
5. No approved acceptance criterion IDs or allowed-path list were provided.

## Authority

This is a PRODUCED proposal only. It must not be merged or marked ACCEPTED until the blockers are resolved, the protected validators pass, and an authorized stage decision is recorded.
