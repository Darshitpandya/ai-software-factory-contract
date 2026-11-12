---
name: architecture-options
description: Evaluate implementation options under existing service topology, NFRs and compatibility obligations.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-architecture
  version: "1.0.0"
---

# architecture-options

## Preconditions and inputs
approved requirements+service graph+API baseline. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Verify source revision and read service dependencies and ADR history from approved sources.
2. Compare synchronous versus asynchronous export within bounded latency/size/reliability requirements.
3. For each alternative record tenancy, compatibility, failure handling, operational burden and rollback costs.
4. Identify hard constraints separately from subjective tradeoffs; cite source IDs.
5. Recommend a decision with unresolved high-impact choice flagged for architecture-owner approval.

## Required deliverables
architecture-options.md. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-architecture.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Omitting rejected alternatives or tenant boundary fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
