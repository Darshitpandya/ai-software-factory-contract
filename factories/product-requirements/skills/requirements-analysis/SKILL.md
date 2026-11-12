---
name: requirements-analysis
description: Analyze a real Port WorkOrder and generate a traceable, bounded product specification.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: product-requirements
  version: "1.0.0"
---

# requirements-analysis

## Preconditions and inputs
WorkOrder+Port service context. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Verify WorkOrder target service and owner against Port; pin the context snapshot digest.
2. Extract personas, desired behavior, current behavior, authorization, backward compatibility, limits and error paths; assign stable requirement IDs.
3. List assumptions as explicit unresolved decisions; do not invent product commitments.
4. Write product-spec.md with scope, out of scope, non-functional constraints and citations back to source issue/Port entity.
5. Check every mandated constraint from the WorkOrder appears in an identifiable requirement.

## Required deliverables
product-spec.md. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-requirements.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing tenant isolation constraint must fail; unresolved product scope becomes WAITING_FOR_HUMAN.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
