---
name: compliance-evidence
description: Assemble traceable security evidence for the actual commit without claiming certification.
license: Apache-2.0
compatibility: Factory Contract v1; approved workspace MCP tools; pinned OpenSandbox stage runtime
metadata:
  owner: security-compliance
  version: "1.0.0"
---

# compliance-evidence

## Preconditions and inputs
protected scanner verdicts+test reports+policy references. Verify provenance and accepted upstream digests before writing any output.

## Required procedure
1. Collect source SHA, scanner version, policy digest and tenant-isolation results.
2. Verify evidence links and SHA-256 against actual outputs.
3. Map results to applicable control IDs and distinguish passed, failed, not-applicable and human-exception.
4. Escalate missing/failed controls to designated security authority.
5. Produce evidence bundle; the independent verifier/authorized human owns final decision.

## Required deliverables
scan-evidence.json+disposition request. Produce only the declared paths; reference actual source revisions, test results and requirement IDs.

## Verification and escalation
Call the fixed project validator corresponding to `verify-security.ts` via an allowlisted sandbox command ID. Do not edit that validator during this task. If its exit code is nonzero, return a failing artifact and explanation; do not claim acceptance. Negative fixture requirement: Missing artifact, forged approval or inconsistent SHA fails.

## Authority boundary
This skill creates a *proposal*. Only protected external checks or an authenticated designated human can mark a production handoff ACCEPTED. The model, permissions and tool surface come from FactoryRelease, not this file.
