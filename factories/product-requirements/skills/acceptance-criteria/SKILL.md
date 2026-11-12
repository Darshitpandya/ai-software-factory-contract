---
name: acceptance-criteria
description: Turn accepted requirements into testable machine-readable acceptance examples and counterexamples.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: product-requirements
  version: "1.0.0"
---

# acceptance-criteria

## Preconditions and inputs
product-spec.md+WorkOrder constraints. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Read only the approved product specification revision, not an unverified agent summary.
2. For each requirement ID create a named success condition, failure condition, applicable verifier and expected artifact.
3. Specify CSV formatting, export bounds, tenant authorization and API compatibility as independently testable conditions.
4. Mark requirements needing product judgement as human decisions; do not generate approval.
5. Validate acceptance.yaml against its canonical JSON schema and traceability matrix.

## Required deliverables
acceptance.yaml. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-requirements.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing compatibility criterion or nonexistent verifier must fail.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
