---
name: adr-authoring
description: Write a versioned architecture decision record tied to accepted requirements and evaluated alternatives.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-architecture
  version: "1.0.0"
---

# adr-authoring

## Preconditions and inputs
product-spec.md+architecture-options.md. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Confirm architecture options contain at least two evaluated alternatives.
2. Write ADR status, context, decision, alternatives, consequences, rollback implications and requirement IDs.
3. Explain effects on existing API consumers, data handling and deployment behavior.
4. Do not mark the ADR approved; create a review request for an authorized owner if required.
5. Run ADR structure checker and check all referenced requirements exist.

## Required deliverables
adr-0007-invoice-export.md. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-architecture.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing consequences/compatibility rationale or forged Approved status fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
