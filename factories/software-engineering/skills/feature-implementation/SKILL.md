---
name: feature-implementation
description: Implement a bounded approved feature from versioned ADR/API requirements in OpenSandbox.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-engineering
  version: "1.0.0"
---

# feature-implementation

## Preconditions and inputs
approved work item+ADR+base commit. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Verify all upstream artifact digests, working tree base SHA and allowed file/path list.
2. Inspect existing app modules and tests; identify minimal safe code change for approved export endpoint.
3. Modify source exclusively inside assigned OpenSandbox workspace; never use privileged host commands.
4. Add tenant-scope, CSV escaping, bounded export and error-path tests before finalizing.
5. Run approved build/test command IDs; if results pass propose commit and PR through trusted coordinator.

## Required deliverables
source patch+tests+PR. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-engineering.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Unscoped database query, failed test or unauthorized patch fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
