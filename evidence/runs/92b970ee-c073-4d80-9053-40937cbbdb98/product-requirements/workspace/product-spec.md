# Product Specification — Notification Event Schema: Add `account.reactivated`

- Run ID: 92b970ee-c073-4d80-9053-40937cbbdb98
- Stage: product-requirements (status: PRODUCED — proposal only, not ACCEPTED)
- Work Order: wo-notification-schema-001
- Requested by: notifications-domain
- Release version / FactoryRelease: 1.4.0
- Source: `work-order.json` (workspace). No Port snapshot, repository base SHA or input artifact SHA-256 was provided, so none are pinned here.

## 0. Blocking preconditions (read first)

| ID | Issue | Impact |
|----|-------|--------|
| BLK-001 | `targetService` is **empty** in the WorkOrder. The target service and its owner cannot be verified against Port. No service or owner is invented in this document. | Port verification and owner resolution cannot be completed. Status: WAITING_FOR_HUMAN. |
| BLK-002 | No Port context snapshot digest or repository base SHA was supplied. | Provenance is not pinned. |

This spec is a draft proposal. It must not be treated as accepted until BLK-001 and BLK-002 are resolved by the designated human owner.

## 1. Summary

The WorkOrder asks for a new event type, `account.reactivated`, to be added to the notification contract. The addition must be non-breaking. Nothing else is stated in the WorkOrder.

## 2. Personas (as far as the WorkOrder supports)

- **Notifications domain (requester):** owns the notification contract and requested the change.
- **Event consumers of the notification contract:** existing consumers must keep working. Their identities are not given, so they are an open item (DEC-006).
- **Event producers:** the service that would emit `account.reactivated` is not identified (DEC-003).

## 3. Current vs. desired behavior

- Current: the notification contract defines a set of event types. Which types exist, and their schema location, are **not in the WorkOrder** and are unverified.
- Desired: the contract also defines `account.reactivated` as a valid event type, and existing event types remain valid and unchanged.

## 4. Requirements

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| REQ-001 | The notification contract SHALL define an event type named exactly `account.reactivated`. | WorkOrder scope | Stated |
| REQ-002 | The change SHALL be additive and non-breaking. No existing event type, field, required-ness, enum value or semantics may be removed or altered. Messages valid under the previous contract SHALL remain valid. | WorkOrder scope ("non-breaking addition") | Stated |
| REQ-003 | The `account.reactivated` schema SHALL be fully defined (payload fields, required fields, types, versioning) before implementation. | Derived — a schema cannot be added without it | Payload content UNRESOLVED (DEC-002) |
| REQ-004 | Tenant isolation: `account.reactivated` events SHALL carry tenant/account scoping consistent with existing contract events, and the schema SHALL NOT permit data from one tenant to be addressed to or exposed to another. | Proposed constraint. Not explicit in the WorkOrder. | Needs human confirmation (DEC-004) |
| REQ-005 | Compatibility with consumers that do not know the new type: the contract SHALL document the expected handling of unknown event types, and the change SHALL NOT require consumer changes to keep existing behavior. | Derived from REQ-002 | Needs confirmation (DEC-005) |
| REQ-006 | The change SHALL be released as part of release 1.4.0, with the contract version and changelog reflecting an additive (minor) change. | WorkOrder `releaseVersion` | Contract version number to be confirmed (DEC-007) |

## 5. Scope

In scope:
- Defining the `account.reactivated` event type and its schema in the notification contract.
- Compatibility verification showing the addition is non-breaking.
- Contract documentation and changelog entry.

## 6. Out of scope (unless a human decides otherwise)

- Implementing emission of `account.reactivated` in any producing service, and defining the business rules for what counts as reactivation (DEC-003).
- Implementing consumer behavior, such as delivery channels or templates.
- Modifying existing event types.
- Any CSV export, export bounds or API pagination behavior. The WorkOrder contains none, so none is specified.

## 7. Non-functional constraints

- Backward compatibility (REQ-002).
- Tenant isolation (REQ-004).
- Traceability: every acceptance criterion and work item references requirement IDs.
- Error paths: how invalid or unknown payloads are rejected or ignored is not specified (DEC-005).

## 8. Unresolved decisions (assumptions are NOT commitments)

| ID | Question | Proposed owner |
|----|----------|----------------|
| DEC-001 | What is the target service and its Port owner? (BLK-001) | notifications-domain / Port service owner, to be resolved from Port |
| DEC-002 | What is the payload of `account.reactivated` (fields, required, types, identifiers)? | notifications-domain |
| DEC-003 | What triggers the event, and which service produces it? Is emission in scope? | notifications-domain and an account domain owner (unresolved) |
| DEC-004 | Confirm the tenant isolation requirement and the tenant identifier field. | notifications-domain, security reviewer |
| DEC-005 | How must consumers and validators treat unknown event types or extra fields? | notifications-domain |
| DEC-006 | Who are the existing consumers, and which compatibility checks do they run? | notifications-domain |
| DEC-007 | What is the current contract version, and does 1.4.0 map to a minor version bump? | notifications-domain |

## 9. Citations

- WorkOrder `wo-notification-schema-001` (`work-order.json`): title, scope, requestedBy, releaseVersion, factoryRelease, runId, stage.
- Port entity: **not resolved**. `targetService` is empty.

## 10. Verification status

The deterministic checks (`verify-requirements.ts`, `pnpm factory registry:verify`) have not been run as part of this document. No test results or approvals are claimed. Status is PRODUCED only.
