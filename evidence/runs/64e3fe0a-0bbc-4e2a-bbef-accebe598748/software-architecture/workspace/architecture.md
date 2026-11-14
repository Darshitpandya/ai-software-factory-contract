# Architecture Proposal — Add `account.reactivated` Notification Event

| Field | Value |
|---|---|
| Work order | wo-notification-schema-001 |
| Run ID | 64e3fe0a-0bbc-4e2a-bbef-accebe598748 |
| Stage | software-architecture |
| FactoryRelease | 1.4.0 (as stated in work-order.json; digest **not verified**) |
| Requested by | notifications-domain |
| Target service | **UNSPECIFIED** (`targetService` is empty in work-order.json) |
| Status | **PRODUCED — DRAFT, BLOCKED ON MISSING INPUTS** (not ACCEPTED) |

> This is a proposal. It is not approved and must not be read as accepted. It was produced
> without the baseline contract, accepted requirements, or service graph (see §2). Nothing in this
> document has been checked against a real baseline.

---

## 1. Scope

Add a new event type, `account.reactivated`, to the notification event contract as a
**backward-compatible addition**. No existing event types, fields, endpoints, parameters or
responses change.

## 2. Input provenance (engineering procedure step 1)

| Required input | Status |
|---|---|
| Accepted requirements / product spec (with requirement IDs) | **MISSING**: not in workspace |
| Current service graph | **MISSING** |
| Baseline notification contract (OpenAPI/AsyncAPI) at protected base SHA | **MISSING** |
| Existing ADR history | **MISSING** |
| Repository base commit SHA | **UNAVAILABLE**: `git rev-parse` is not on the command allowlist |
| Input artifact SHA-256 digests | **UNAVAILABLE**: no input artifacts to hash |
| FactoryRelease digest | **NOT VERIFIED**: only the version string `1.4.0` is available |
| Target service | **MISSING**: `targetService` is `""` |

Also: the stage's AGENTS.md lists the outputs as `adr-0007-invoice-export.md`, `openapi.yaml`
and `architecture-evidence.json`, which belong to an invoice-export work order. This run was asked
for `architecture.md`, `openapi-delta.yaml` and `adr.md`. The FactoryRelease output declaration
needs to be reconciled with this work order before these artifacts can be accepted.

## 3. Assumptions (all must be confirmed against the baseline)

- A1. The notification contract uses a common envelope with an `eventType` discriminator.
  The discriminator is either a string enum or a `oneOf` with a `discriminator.mapping`.
- A2. Existing account lifecycle events follow the `account.<verb-past-tense>` naming pattern
  (for example `account.suspended` / `account.deactivated`). `account.reactivated` is the inverse
  transition.
- A3. Events are tenant-scoped. The envelope already carries a tenant identifier that is set
  by the producer from authenticated context, never from caller input.
- A4. Delivery happens through an existing channel (webhook and/or message bus) with
  at-least-once semantics and consumer idempotency based on `eventId`.

If any assumption is false, this proposal has to be revised.

## 4. Proposed design

### 4.1 Event definition
- `eventType`: `account.reactivated`
- Payload `AccountReactivatedData`:
  - `accountId` (string, required)
  - `reactivatedAt` (date-time, required)
  - `previousStatus` (enum `suspended` | `deactivated`, required): the state the account left
  - `reason` (string, optional, max 512, **no PII**)
  - `actor` (object, optional): `type` (`user` | `system` | `support`), `id` (opaque string)
- Envelope fields (`eventId`, `occurredAt`, `tenantId`, `schemaVersion`) are reused unchanged.

### 4.2 Producer and consumer behaviour
- The producer (account-lifecycle owner, **service to be confirmed**) emits the event once per
  state transition from `suspended`/`deactivated` back to `active`, after the transition commits.
  Use the transactional outbox if the producer already has one.
- Consumers that do not recognise `account.reactivated` must ignore it. This depends on the
  existing tolerant-reader rule, which needs confirming (see §5).

### 4.3 Tenancy and data handling
- `tenantId` comes from the producer's authenticated context only. Events are routed only to
  subscribers within the same tenant.
- The payload has no PII. `reason` is free text, so producers must not put personal data in it,
  and this needs a data-handling review.

## 5. Compatibility analysis

| Change | Classification | Note |
|---|---|---|
| New schema `AccountReactivatedData` | Non-breaking | Additive component |
| New `oneOf` branch / discriminator mapping entry | Non-breaking for request-side; **potentially breaking for consumers** | Consumers with closed-enum or exhaustive-switch deserialisation may reject the new value |
| New value in `eventType` enum (if enum-based) | oasdiff typically reports a **response/payload enum-value-added warning** | Non-breaking only if consumers are contractually tolerant readers |
| Existing endpoints, parameters, responses | Unchanged | No new required parameters (for example, no required `tenant_id` query param on existing routes) |

**Open high-impact question (owner decision required):** does the baseline contract or consumer
policy document that unknown event types must be ignored? If not, adding the new value is a
behavioural compatibility risk, and the change needs either a consumer opt-in subscription filter or
an explicit architecture exception.

## 6. Alternatives considered (summary; detail in adr.md)
1. **Add a new event type `account.reactivated`.** Recommended.
2. Reuse a generic `account.status_changed` event with `from`/`to` fields. Rejected for this work
   order: it changes semantics for existing subscribers and is out of scope.
3. Re-emit `account.created` on reactivation. Rejected: it breaks consumer idempotency and the
   meaning of the event.

## 7. Failure handling, operations and rollback
- Failure: if the producer fails to emit, the outbox retries. Delivery failures follow the existing
  retry/DLQ policy. No new infrastructure.
- Operations: add per-event-type emission and delivery metrics. No new runtime services.
- Rollback: stop emitting with a producer feature flag. Keep the schema in the contract, because
  removing an event type is itself breaking for anyone who adopted it. Rolling back changes no data.

## 8. Verification status (engineering procedure step 5)

| Check | Command | Result |
|---|---|---|
| Architecture verifier | `pnpm exec tsx factories/software-architecture/scripts/verify-architecture.ts` | **Did not run.** Nonzero exit: `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE No package found in this workspace` |
| oasdiff validate / breaking vs trusted base | n/a | **Not run.** No baseline spec and no oasdiff command on the allowlist |
| Registry verify | `pnpm factory registry:verify` | **Not run.** The same workspace has no package |

No check has passed, so these artifacts are **not** ready for acceptance.

## 9. Required to unblock
1. Provide the accepted requirements with requirement IDs.
2. Provide the baseline notification contract and the protected base SHA.
3. Set `targetService` (the producing service) and provide the service graph.
4. Reconcile the FactoryRelease output declaration (invoice-export outputs vs this work order).
5. Provide a workspace where the verifier and oasdiff can run, then re-run §8.
