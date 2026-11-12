---
name: release-assessment
description: Assess a previously accepted artifact against protected test-deployment requirements.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: platform-operations
  version: "1.0.0"
---

# release-assessment

## Preconditions and inputs
accepted commit+release policy+SLO+deployment target. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Verify GitHub required check and authorization for exact commit; no merge by default.
2. Resolve image digest, current known-good image, environment scope and deployment window.
3. Select approved test rollout and smoke/health thresholds; do not fabricate SLO values.
4. Identify rollback trigger, responsible owner and required approval.
5. Write plan for trusted deployment workflow; never invoke deployment with unapproved credentials.

## Required deliverables
deployment-plan.json. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-deployment.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing known-good digest/approval or unknown target fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
