# ADR-XXXX (provisional number): Add `account.reactivated` notification event type

| Field | Value |
|---|---|
| Status | **Proposed** (NOT approved. Approval needs an authenticated designated architecture owner) |
| Work order | wo-notification-schema-001 |
| Run ID | 92b970ee-c073-4d80-9053-40937cbbdb98 |
| Release | 1.4.0 |
| Requested by | notifications-domain |
| Requirement IDs | **NONE AVAILABLE**. Accepted requirements weren't provided. Must be linked before review. |
| Source revision / base SHA | **UNKNOWN**. Not provided to this stage. |
| ADR number | Provisional. ADR history wasn't available to find the next number. |

## Context
The notifications domain needs subscribers to be told when a previously deactivated or suspended account becomes active again. The work order scope is: "Add account.reactivated event type to notification contract — non-breaking addition." At present (ASSUMPTION, not checked against the baseline) consumers would have to infer reactivation from generic updates or polling.

The baseline contract, service graph, target service and accepted requirements weren't available to this stage. The context below is based on the work-order scope plus explicit assumptions listed in `architecture.md` §2.

## Decision (proposed)
Add a new discriminated event type `account.reactivated` with its own payload schema (`AccountReactivatedEvent` / `AccountReactivatedData`). It's delivered through the existing asynchronous notification pipeline, scoped to a single tenant, and only to subscriptions that opt in to the type. See `openapi-delta.yaml`.

## Alternatives considered
1. **New discriminated event type (chosen).** Additive, explicit, low operational burden.
2. **Reuse `account.updated` with a status field (rejected).** Changes the meaning of an existing event without a schema signal, which is a behavioral break that tools won't detect.
3. **Generic `account.status_changed` replacing specific events (rejected).** Needs migration or deprecation of existing events, so it's breaking and out of scope.
4. **Synchronous callout during reactivation (rejected).** Couples account-service availability and latency to subscribers.

## Consequences
**Existing API consumers**
- No existing operation, parameter, response or event schema is changed or removed. No new required fields on existing schemas.
- Consumers subscribed by type won't receive the new event unless they opt in (ASSUMPTION A4).
- **Compatibility risk:** if the baseline `NotificationEventType` is a closed enum and consumers use strict generated clients, appending a value may break deserialization for consumers who get all event types. Before acceptance, the architecture owner must rule on this using oasdiff output against the protected baseline. If it's classed as breaking, an architecture exception must be requested through the authorized channel.

**Data handling**
- The payload has identifiers, timestamps and coarse categorical fields only (`actor_type`, `previous_status`, `reason_code`). No personal data or actor identity.
- Tenant isolation stays as it is: events carry `tenant_id` and are routed only to that tenant's subscriptions.

**Deployment behavior**
- Rollout order: publish the contract → consumers update (optional) → producer starts emitting behind a feature flag.
- Existing at-least-once delivery, retry and DLQ behavior applies. Consumers deduplicate by `id`.

## Rollback implications
- **Producer rollback:** turn off the emit flag. No consumer impact other than the event stopping.
- **Contract rollback:** removing the event type after publication would itself be a breaking change. The schema should be kept and marked deprecated, not removed.
- No data migration is involved, so rollback has no data-loss risk.

## Verification status
- `pnpm exec tsx factories/software-architecture/scripts/verify-architecture.ts`: **exit nonzero** (`ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`). The validator couldn't run in this sandbox.
- `pnpm factory registry:verify`: **exit nonzero** (`ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`).
- oasdiff validate/breaking: **not run** (no baseline).
- No test results exist. None are claimed.

## Review request
A review by the designated software-architecture domain owner (identity to be resolved from Port) is required for:
(a) the closed-enum compatibility ruling, (b) target service / producer dependency boundary, (c) linking accepted requirement IDs, (d) the final ADR number.
