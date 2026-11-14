# Architecture Options — Add `account.reactivated` Notification Event

| Field | Value |
|---|---|
| Work order | wo-notification-schema-001 |
| Run ID | 92b970ee-c073-4d80-9053-40937cbbdb98 |
| Stage | software-architecture |
| FactoryRelease | 1.4.0 (digest NOT verified — not present in workspace) |
| Requested by | notifications-domain |
| Status | **DRAFT / PRODUCED — UNVERIFIED** (not accepted, not approved) |

## 0. Provenance and precondition status (read first)

| Required input (AGENTS.md / skills) | Status in this run |
|---|---|
| Accepted requirements (product-spec.md, requirement IDs) | **MISSING** — no requirement IDs available; none are cited or made up |
| Current service graph | **MISSING** |
| Baseline notification contract (OpenAPI/AsyncAPI) at protected base SHA | **MISSING** |
| Repository base SHA | **MISSING** |
| ADR history | **MISSING** (ADR number used below is provisional) |
| Target service | **EMPTY** in work order (`targetService: ""`) |
| Input artifact SHA-256 values | **NOT VERIFIABLE** |
| `verify-architecture.ts` | **NOT RUN** — exit nonzero, `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE` (no package in sandbox) |
| `pnpm factory registry:verify` | **NOT RUN** — exit nonzero, `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` |

As a result, this document is a design proposal based only on the work-order scope. All statements about the existing contract are **assumptions** (marked `ASSUMPTION`). An owner must check them against the real baseline before acceptance.

## 1. Scope

Add a new notification event type, `account.reactivated`, to the notification contract. The work order says this is a **non-breaking addition**. Existing event types, payload fields, delivery semantics and endpoints must not change.

## 2. Assumed context (to be checked)

- ASSUMPTION A1: The notification contract has a discriminated event envelope (`id`, `type`, `occurred_at`, `tenant_id`/account scope, `data`). `type` is a string enum or open string.
- ASSUMPTION A2: Events are delivered to subscribers through webhooks (described as OpenAPI 3.1 `webhooks`) and/or a broker topic.
- ASSUMPTION A3: An `account.deactivated` (or similar suspension) event already exists. `account.reactivated` is its inverse.
- ASSUMPTION A4: Subscriptions filter by event type, so consumers that don't subscribe to the new type won't receive it.

## 3. Hard constraints vs. tradeoffs

**Hard constraints** (from the work order and the openapi-contract skill):
- HC1: No breaking change to any existing operation, parameter, response, or event schema (checked with oasdiff `breaking` against the trusted base).
- HC2: No new required fields on existing schemas. No removal or narrowing of existing enum values.
- HC3: Tenant isolation: every event is scoped to exactly one tenant/account. It is delivered only to that tenant's subscriptions.
- HC4: The baseline must come from the protected base commit, never from a PR-modified copy.

**Subjective tradeoffs:** payload richness, naming of reason codes, and whether to use a separate schema or reuse the deactivation payload.

## 4. Alternatives evaluated

### Option A — New discriminated event type `account.reactivated` with its own payload schema (RECOMMENDED)
Add `account.reactivated` to the event type set. Add a new `AccountReactivatedData` schema and a new `oneOf`/discriminator mapping entry.
- **Tenancy:** Carries the same tenant/account scope as other account events. Routing doesn't change.
- **Compatibility:** Purely additive. Risk: if the baseline `type` is a **closed enum** and consumers validate strictly, generated clients may reject unknown values. oasdiff classifies adding an enum value to a *response/webhook payload* as a possible client-side break. This **needs owner review** (see §6).
- **Failure handling:** Uses the existing at-least-once delivery, retries and DLQ. The event `id` makes it idempotent.
- **Operational burden:** Low. One schema and one producer emit point.
- **Rollback:** Stop emitting. Leave the schema in place (it's additive, so removal would itself be breaking).

### Option B — Reuse an existing event (e.g. `account.updated`) with `status: active` (REJECTED)
- **Tenancy:** Unchanged.
- **Compatibility:** No schema change. But it changes the meaning of an existing event that consumers already handle, which is a behavioral break that diff tools won't catch.
- **Failure handling:** Unchanged.
- **Operational burden:** Every consumer that needs reactivation has to infer state changes.
- **Rollback:** Cheap technically, but the change in meaning can't be cleanly undone.
- **Rejected because** it doesn't match the explicit scope ("add event type") and hides the business event.

### Option C — Generic `account.status_changed` event replacing specific events (REJECTED)
- **Compatibility:** Requires deprecating or migrating existing account events. It's breaking or needs a long dual-publish period.
- **Operational burden:** High: a migration and dual publishing.
- **Rejected because** it's outside the scope of a non-breaking addition.

### Sync vs. async (architecture-options step 2)
Notification events are asynchronous by nature. A synchronous callout in the reactivation transaction would couple account-service latency and availability to subscribers. **Async (existing delivery pipeline) is kept.** No new sync path is introduced.

## 5. Recommendation
Option A, using the existing async delivery pipeline. Payload details are in `openapi-delta.yaml`. The decision record is in `adr.md`.

## 6. Unresolved high-impact items for architecture-owner approval
1. **Closed vs. open `type` enum** in the baseline. If closed, adding a value to a webhook/response payload may be flagged as a breaking change for strict consumers. This needs an explicit compatibility ruling or an architecture exception through the authorized channel.
2. **Target service** isn't specified. The producer (likely an account or identity service) and its dependency boundary are unknown. Per AGENTS.md, an unknown dependency boundary requires escalation.
3. **Requirement IDs** must be supplied from accepted requirements and linked.
4. **PII:** confirm the payload excludes personal data beyond IDs (the proposal includes IDs only).

## 7. Verification evidence
No deterministic check has passed. Both allowlisted commands exited nonzero because the sandbox has no package manifest (see §0). No oasdiff output exists. **This artifact must not be treated as accepted.**
