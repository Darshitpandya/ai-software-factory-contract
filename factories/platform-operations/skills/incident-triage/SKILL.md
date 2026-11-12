---
name: incident-triage
description: Correlate test-deployment health and recent changes using read-only telemetry.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: platform-operations
  version: "1.0.0"
---

# incident-triage

## Preconditions and inputs
deployment ID+real logs/metrics+source revision. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Read only authorized deployment events, failed health checks, error logs and associated commits.
2. Build a factual timeline with source IDs, timestamps and impacted test service.
3. Differentiate observation from hypothesis; annotate uncertainty.
4. Recommend rollback or reviewable remediation WorkOrder with referenced evidence.
5. Do not execute production commands or claim issue resolved before health recheck.

## Required deliverables
incident-diagnosis.json. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-deployment.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: No telemetry or fabricated root cause fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
