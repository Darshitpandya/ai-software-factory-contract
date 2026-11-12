---
name: security-review
description: Analyze source/security findings against protected policy without claiming self-issued compliance.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: security-compliance
  version: "1.0.0"
---

# security-review

## Preconditions and inputs
candidate commit+scanner results+service classification. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Read verified scanner results and source commit SHA; reject missing or stale findings.
2. Prioritize tenant isolation, secrets, unsafe dependency changes and PII exposure for this WorkOrder.
3. Map each finding to evidence, severity and applicable rule; distinguish false positives as unapproved proposals.
4. Recommend remediation or qualified exception path with human authority; never write approved disposition.
5. Generate machine-readable finding IDs, file/line references and recommended next action.

## Required deliverables
security-findings.json. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-security.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing critical finding or invented scanner result fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
