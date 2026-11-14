# Product Specification — Notification Event Schema: Add `account.reactivated`

- Work order: `wo-notification-schema-001`
- Run ID: `64e3fe0a-0bbc-4e2a-bbef-accebe598748`
- Stage: `product-requirements` (status: PRODUCED — proposal only, not ACCEPTED)
- Requested by: `notifications-domain`
- Release version: `1.4.0` (FactoryRelease `1.4.0`)
- Source: `work-order.json` (the only verified input; no Port snapshot, issue, or repo SHA was available in the workspace)

## 1. Provenance and verification status

| Check | Status |
|---|---|
| WorkOrder read from `work-order.json` | Done |
| `targetService` verified against Port | **NOT DONE — `targetService` is empty in the WorkOrder** |
| Service owner resolved from Port | **NOT DONE — no target service, so no owner can be resolved** |
| Port context snapshot digest pinned | **NOT DONE — no Port context was provided** |
| Input artifact SHA-256 / repo base SHA / FactoryRelease digest | **NOT PROVIDED** in the workspace; not verified |

No owner, service name, or existing schema details have been invented. Anything dependent on these is listed in Section 8 as an unresolved decision.

## 2. Summary

The notification contract needs a new event type, `account.reactivated`. It is added as a **non-breaking, additive** change in release `1.4.0`. Existing event types, their payloads, and existing consumers must continue to work unchanged.

## 3. Personas

- **Notification event producer** (a service that emits events under the notification contract): needs a defined, validated way to emit `account.reactivated`.
- **Notification event consumer** (services and domains consuming the contract): needs the new type added without breaking existing handling of other events.
- **Notifications domain owner** (`notifications-domain`, the requester): owns the contract and approves the change.

Personas come only from the WorkOrder scope. Further personas are not asserted.

## 4. Current vs. desired behavior

- **Current:** The notification contract has no `account.reactivated` event type. The contents of the current contract are not available in this workspace and are not asserted here.
- **Desired:** The contract defines `account.reactivated` as a valid event type. It is published as part of release `1.4.0` without changing the meaning or validity of any existing event type.

## 5. Requirements

| ID | Requirement | Source |
|---|---|---|
| REQ-001 | The notification contract SHALL define a new event type named exactly `account.reactivated`. | WorkOrder scope |
| REQ-002 | The change SHALL be strictly additive and non-breaking: no existing event type, field, required-ness, type, enum value, or semantic SHALL be removed, renamed, or altered. | WorkOrder scope ("non-breaking addition") |
| REQ-003 | Payloads and events valid under the previous contract version SHALL remain valid under the version containing `account.reactivated` (backward compatibility). | WorkOrder scope; API compatibility constraint |
| REQ-004 | The `account.reactivated` definition SHALL have a machine-validatable payload schema. Payload fields are an open decision (see OD-003). Fields must not be invented here. | Derived from REQ-001 |
| REQ-005 | **Tenant isolation:** the `account.reactivated` event SHALL carry whatever tenant/account identification the existing contract uses for other account events, so it cannot be delivered or attributed across tenants. The exact field is to be confirmed (OD-004). | Mandated tenant-isolation constraint (generic factory constraint; see OD-004) |
| REQ-006 | **Authorization:** emitting and consuming `account.reactivated` SHALL follow the same authorization model as existing notification events. No new permission model is introduced by this change. Confirmation is required (OD-005). | Derived from REQ-002 |
| REQ-007 | **Error paths:** an event of type `account.reactivated` that fails schema validation SHALL be rejected using the contract's existing validation-failure behavior. Consumers that do not know this type SHALL behave as they do for any unknown event type. Existing behavior must be confirmed (OD-006). | Derived from REQ-002, REQ-003 |
| REQ-008 | The contract version and changelog SHALL record the addition in release `1.4.0`, classified as a minor/non-breaking change. | WorkOrder `releaseVersion` |

## 6. Scope

**In scope**
- Adding the `account.reactivated` event type and its payload schema to the notification contract.
- Version/changelog update for release `1.4.0`.
- Compatibility verification against the prior contract version.

**Out of scope**
- Changes to any existing event type.
- Defining the business triggers for reactivation inside any producer service.
- Consumer-side feature work (such as new notification templates or delivery channels) for the new event.
- Any breaking change, deprecation, or removal.
- Any architecture or transport change.

## 7. Non-functional constraints

- **NFC-1 Backward compatibility:** non-breaking, per REQ-002 and REQ-003.
- **NFC-2 Tenant isolation:** per REQ-005.
- **NFC-3 Testability:** every requirement must be verifiable by a deterministic check (see `acceptance.yaml`).
- **NFC-4 Limits:** CSV formatting and export bounds are not applicable, because this change has no CSV export or bulk-export behavior in its scope. Payload size limits follow existing contract limits (to be confirmed, OD-007).

## 8. Unresolved decisions (WAITING_FOR_HUMAN)

| ID | Decision / question | Suggested owner |
|---|---|---|
| OD-001 | **`targetService` is empty.** Which Port service entity owns the notification contract? Required to verify the service and owner. **Blocking.** | notifications-domain / Port catalog owner |
| OD-002 | Who is the designated product-requirements owner and service owner for approval? Not resolvable without OD-001. **Blocking.** | Port |
| OD-003 | What are the payload fields of `account.reactivated`, which are required, and what is the field naming convention? | notifications-domain |
| OD-004 | What is the tenant/account identifier field in the existing contract, and must it be required on this event? | notifications-domain |
| OD-005 | Is the existing authorization model sufficient and unchanged for this event type? | notifications-domain / security |
| OD-006 | What are the existing unknown-event and validation-failure behaviors for consumers and producers? | notifications-domain |
| OD-007 | What are the existing payload size and rate limits, and do they apply unchanged? | notifications-domain |
| OD-008 | What is the contract format (JSON Schema, AsyncAPI, protobuf, etc.) and its repo location? Needed to choose the compatibility verifier. | notifications-domain |

## 9. Assumptions
No assumptions are adopted as commitments. Everything listed in Section 8 is an open decision.

## 10. Status
This document is a **proposal** in PRODUCED state. Acceptance requires the protected verifier and an authorized human decision. The stage is flagged blocked on OD-001 and OD-002.
