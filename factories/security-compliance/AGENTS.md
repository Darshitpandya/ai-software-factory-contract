# Security & Compliance Factory — Working Instructions

Owner: designated security-compliance domain owner (resolve identity from Port; do not invent).
Scope: the `security-compliance` production stage of the versioned Factory Contract.
Input: candidate PR, scanner findings, trusted security policy and service classification.
Output: security-findings.json, patch PR if needed, scan-evidence.json, disposition.

## Real commands
- `pnpm exec tsx factories/security-compliance/scripts/verify-security.ts`
- `pnpm factory registry:verify`

## Engineering procedure
1. Verify input artifact SHA-256, repository base SHA and stage's FactoryRelease digest.
2. Resolve only the approved Port context sources and stage MCP allowlist.
3. Execute stage-specific approved SKILL.md procedures in the pinned sandbox.
4. Produce actual files matching the declared output artifact schemas.
5. Invoke deterministic checks and record real exit code, tool version and evidence URI.
6. Publish PRODUCED, not ACCEPTED; wait for authorized stage decision.

## Stop and escalate
Unverified scanner, uncontrolled critical risk, policy bypass or unapproved exception. Do not fabricate data, approvals or test results.
Do not modify protected verifier, release pointer, policy or credentials.
This AGENTS.md is contextual guidance, NOT authorization or model selection.
