---
name: remediation-plan
description: Route a verified operational failure to controlled rollback or engineering work.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: platform-operations
  version: "1.0.0"
---

# remediation-plan

## Preconditions and inputs
incident diagnosis+rollback policy+known-good revision. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Validate incident links to a real deployment and failing health evidence.
2. Compare authorized rollback eligibility with risk policy and approval requirements.
3. For permitted rollback, produce a bounded action request against exact known-good digest.
4. For other cases create a new linked WorkOrder/PR proposal without modifying production.
5. After action, require fresh health evidence and record original incident relation.

## Required deliverables
remediation-plan.json+new WorkOrder/rollback request. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-deployment.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Unknown rollback target, unauthorized write or missing post-action health fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
