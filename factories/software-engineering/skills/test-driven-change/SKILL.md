---
name: test-driven-change
description: Use existing test suite and acceptance criteria to generate and execute tests before accepting code.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-engineering
  version: "1.0.0"
---

# test-driven-change

## Preconditions and inputs
approved acceptance IDs+repo test commands. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Map each implemented behavior to accepted criterion IDs.
2. Add tests for existing API compatibility, auth failures, cross-tenant data, CSV formula escape and export limits.
3. Run only allowlisted repository install/build/test commands in OpenSandbox.
4. Record real exit codes and failure logs; iterate within approved budget and attempt limits.
5. Report untested criteria explicitly; do not infer success from a narrative response.

## Required deliverables
tests+test-results.json. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-engineering.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Tests never executed or missing required criterion coverage fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
