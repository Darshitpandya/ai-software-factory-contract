# Implementation Notes — wo-notification-schema-001

**Run ID:** 64e3fe0a-0bbc-4e2a-bbef-accebe598748
**Stage:** software-engineering
**Work order:** Notification Event Schema — Add `account.reactivated`
**Requested by:** notifications-domain
**Target release:** 1.4.0
**Status of this artifact:** PRODUCED (proposal only). **Stage is BLOCKED.** No code change was made.

---

## 1. Summary

The scope is to add an `account.reactivated` event type to the notification contract as a non-breaking addition. **This stage could not implement the change.** Required preconditions are missing from the sandbox workspace, and the mandatory deterministic checks could not run. This document records what was verified, what is missing, and the planned implementation for when the preconditions are supplied.

Nothing in this document is a claim of implemented code, passing tests, or acceptance.

## 2. Precondition verification (AGENTS.md step 1 / feature-implementation step 1)

| Precondition | Expected | Observed | Result |
|---|---|---|---|
| Accepted ADR for the change | ADR artifact + SHA-256 digest | Not present in workspace or work order | **MISSING** |
| Work items / acceptance criterion IDs | Approved list | Not present | **MISSING** |
| Repository base SHA | Commit SHA of target repo | Not provided; no repository in workspace | **MISSING** |
| Target service / repo | Named service | `targetService` is an empty string `""` | **MISSING** |
| Upstream artifact digests | SHA-256 for each input | None provided | **MISSING** |
| FactoryRelease digest | Digest for release 1.4.0 | Only the version string `1.4.0` given, no digest | **MISSING** |
| Allowed file/path list | Approved path allowlist | Not provided | **MISSING** |
| Existing notification contract source | Schema files (e.g. JSON Schema / AsyncAPI / TS types) | Not present | **MISSING** |

Workspace contents at execution time: `README.md` and `work-order.json` only.

## 3. Deterministic checks actually executed

These are the real results from this run. Nothing has been changed or summarized beyond the tool output.

| Command | Exit | Output (verbatim excerpt) |
|---|---|---|
| `pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts` | nonzero | `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE  No package found in this workspace` |
| `pnpm factory registry:verify` | nonzero | `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND  No package.json (or package.yaml, or package.json5) was found in "<sandbox dir>"` |

The validator could not run because there is no repository or `package.json` in the sandbox. Per the skill's escalation rule ("If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance"), this stage returns a failing/blocked result.

No tests were written or run. Under the test-driven-change skill, all criteria are therefore **UNTESTED**.

## 4. Planned implementation (to run once preconditions are supplied)

This plan is a proposal. The exact file paths depend on the target repository, which has not been identified.

### 4.1 Contract change (additive only)
1. Find the notification event contract, e.g. an event-type enum or discriminated union in JSON Schema, AsyncAPI, Avro, or TypeScript types.
2. Add `account.reactivated` as a new member of the event-type enum or union. Do not reorder, rename, or remove existing members.
3. Add a payload definition for `account.reactivated`. The suggested shape mirrors the existing `account.*` events. The ADR must confirm the exact fields:
   - `eventId` (string, UUID, required)
   - `eventType` (const `"account.reactivated"`, required)
   - `occurredAt` (string, RFC 3339 date-time, required)
   - `tenantId` (string, required; keeps tenant isolation)
   - `accountId` (string, required)
   - `reactivatedBy` (string, optional; actor ID)
   - `previousStatus` (string enum, optional, e.g. `suspended` | `deactivated`)
   - `schemaVersion` (string, required)
4. Any new fields must be optional or confined to the new event type, so existing producers and consumers stay valid.
5. Bump the contract version as a **minor** version (consistent with release 1.4.0), not a major one.

### 4.2 Compatibility guarantees to verify
- Existing event payloads still validate unchanged (backward compatibility).
- Consumers that do not recognise `account.reactivated` must not fail. Check that the contract or consumer guidance allows unknown event types to be ignored or routed to a default handler (forward compatibility). If any consumer uses an exhaustive switch that throws on unknown types, flag it in the PR.
- If a schema registry is in use, run its compatibility check in BACKWARD (or BACKWARD_TRANSITIVE) mode.

### 4.3 Tests to add
| Proposed criterion | Test |
|---|---|
| AC-1 New event validates | A valid `account.reactivated` payload passes schema validation |
| AC-2 Required fields enforced | A payload missing `tenantId`, `accountId`, `eventId` or `occurredAt` fails |
| AC-3 Non-breaking | Fixtures for all pre-existing event types still pass |
| AC-4 Tenant scoping | A payload with no tenant, or a mismatched tenant, is rejected or not routed |
| AC-5 Unknown-type tolerance | Consumer test: an unknown event type is not fatal |
| AC-6 Registry compatibility | The schema registry compatibility check passes against the previous version |

The criterion IDs above are placeholders. They must be mapped to the approved acceptance IDs from the work items once those are provided.

### 4.4 Out of scope
- Producer-side emission logic in the account service. That needs a separate work item unless the ADR includes it.
- Notification templates or delivery channels for the new event.

## 5. Inputs required to unblock

1. The accepted ADR, with its SHA-256 digest.
2. The target repository/service and base commit SHA. `targetService` is currently empty.
3. Approved work items with acceptance criterion IDs.
4. The FactoryRelease 1.4.0 digest and the allowed file/path list.
5. A sandbox with the repository checked out, so that `verify-engineering.ts` and `registry:verify` can run.

## 6. Authority

This artifact is a PRODUCED proposal. It is not ACCEPTED. No approvals have been inferred or fabricated.
