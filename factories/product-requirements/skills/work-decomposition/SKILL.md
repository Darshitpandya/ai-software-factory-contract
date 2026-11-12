---
name: work-decomposition
description: Decompose approved product requirements into bounded dependency-mapped engineering work items.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: product-requirements
  version: "1.0.0"
---

# work-decomposition

## Preconditions and inputs
product-spec.md+acceptance.yaml. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Read approved requirement IDs, accepted constraints and architecture unknowns.
2. Create smallest independently testable tasks; map each to requirement IDs and acceptance criterion IDs.
3. Declare dependencies; do not assume architecture choice has been approved.
4. Create explicit blocking questions and ownership for cross-domain decisions.
5. Validate task graph is acyclic and every requirement maps to a task or explicit exclusion.

## Required deliverables
work-items.json. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-requirements.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Cycle or unreferenced required criterion must fail.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
