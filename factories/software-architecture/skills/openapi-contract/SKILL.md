---
name: openapi-contract
description: Produce and validate an OpenAPI modification without breaking the trusted baseline.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-architecture
  version: "1.0.0"
---

# openapi-contract

## Preconditions and inputs
accepted ADR+base SHA+baseline spec. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Resolve API baseline by protected base commit SHA, never a PR-modified baseline.
2. Modify OpenAPI to describe the export capability; preserve existing endpoint parameters and responses.
3. Generate request/response fixtures including unauthorized and over-limit cases.
4. Run oasdiff validate and breaking against trusted base; preserve machine-readable output.
5. If any mandatory breaking change appears, stop or request explicit architecture exception through authorized channel.

## Required deliverables
openapi.yaml+API fixtures. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-architecture.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Adding required query tenant_id to existing GET /v1/invoices fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
