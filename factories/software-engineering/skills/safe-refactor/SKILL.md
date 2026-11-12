---
name: safe-refactor
description: Constrain structural changes to preserve behavior and avoid unauthorized scope expansion.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: software-engineering
  version: "1.0.0"
---

# safe-refactor

## Preconditions and inputs
accepted change scope+existing source+test suites. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. List affected files and invariants; preserve external API and tenant isolation behavior.
2. Keep edits within approved directories and do not modify workflow/security policy files.
3. Run approved typecheck/unit/integration suite and compare results before and after.
4. Record diff summary and why each file changed.
5. If architectural scope expands, pause for a new ADR approval rather than continuing silently.

## Required deliverables
bounded refactor patch+regression results. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-engineering.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Forbidden files, missing before/after regression or breaking contract fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
