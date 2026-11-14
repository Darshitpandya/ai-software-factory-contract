# ADR (proposed): Add `account.reactivated` to the Notification Event Contract

| Field | Value |
|---|---|
| Status | **Proposed** (draft; **not** Approved; awaiting an authorized architecture owner) |
| Work order | wo-notification-schema-001 |
| Run ID | 64e3fe0a-0bbc-4e2a-bbef-accebe598748 |
| Release | 1.4.0 |
| Requirement IDs | **UNRESOLVED**: no accepted requirements were provided. Link real IDs before review. |
| ADR number | **UNASSIGNED**: ADR history not available. |
| Deciders | Architecture owner to be resolved from Port (not invented here) |

## Context
The notifications domain needs downstream systems to be told when an account returns to
`active` after being `suspended` or `deactivated`. No event currently covers this transition (an
assumption, because the baseline contract was not available). The work order requires the change
to be a non-breaking addition.

Constraints:
- Hard: no changes to existing endpoints, parameters, responses or event schemas. No new required
  inputs on existing operations.
- Hard: events stay tenant-scoped, and `tenantId` comes from the producer's authenticated context.
- Soft: follow the existing `account.<past-tense-verb>` naming and envelope conventions.

## Decision (proposed)
Introduce a new event type, `account.reactivated`, with payload `AccountReactivatedData`
(`accountId`, `reactivatedAt`, `previousStatus`, optional `reason` and `actor`). It uses the existing
envelope and delivery channels. The account-lifecycle producer emits it once, after the
transition commits. Schema details are in `openapi-delta.yaml`.

## Alternatives
| # | Option | Outcome | Rationale |
|---|---|---|---|
| 1 | New `account.reactivated` event type | **Chosen** | Additive, explicit meaning, and consumers can opt in |
| 2 | Generic `account.status_changed` with `from`/`to` | Rejected | Changes the event model for existing subscribers and is larger than this work order |
| 3 | Re-emit `account.created` on reactivation | Rejected | Wrong meaning, and it breaks consumer idempotency and creation-based workflows |
| 4 | No event; consumers poll account status | Rejected | Adds latency and load, and does not meet the notification intent |

## Consequences
**Existing API consumers**
- No existing operation, parameter or response changes.
- Adding a value to the `eventType` enum or discriminator **can break consumers that deserialise
  with closed enums or exhaustive switches**. The change is safe only if the contract requires
  tolerant readers (ignore unknown event types). **This is the open high-impact question for the
  architecture owner.** If tolerance is not guaranteed, deliver the event only to subscriptions that
  explicitly opt in to `account.reactivated`.

**Data handling**
- No new PII. `reason` must not contain personal data, and `actor.id` is opaque.
- Tenant isolation is unchanged: events route only within the originating tenant.

**Deployment**
- Deploy in this order: (1) publish the contract, (2) consumers that want the event deploy handlers,
  (3) turn on the producer feature flag.
- No new infrastructure. Add metrics for each event type.

## Rollback implications
- Turning off the producer flag stops emission immediately, with no data migration.
- The schema stays in the contract after rollback. Removing a published event type would itself be a
  breaking change for consumers that adopted it.

## Verification
- `verify-architecture.ts`: **did not run** (exit nonzero, `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`).
- oasdiff breaking check against the trusted base: **not run** (no baseline, no base SHA).
- This ADR must not move past Proposed until those checks run and an authorized owner reviews it.

## Review request
An authorized software-architecture owner needs to:
1. Supply or link the accepted requirement IDs and baseline contract.
2. Decide whether consumers are guaranteed tolerant readers (or require opt-in delivery).
3. Confirm the producing service (`targetService` is empty).
