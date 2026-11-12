# Software Architecture Factory — Working Instructions

Owner: designated software-architecture domain owner (resolve identity from Port; do not invent).
Scope: the `software-architecture` production stage of the versioned Factory Contract.
Input: accepted requirements, current service graph, baseline OpenAPI and ADRs.
Output: adr-0007-invoice-export.md, openapi.yaml, architecture-evidence.json.

## Real commands
- `pnpm exec tsx factories/software-architecture/scripts/verify-architecture.ts`
- `pnpm factory registry:verify`

## Engineering procedure
1. Verify input artifact SHA-256, repository base SHA and stage's FactoryRelease digest.
2. Resolve only the approved Port context sources and stage MCP allowlist.
3. Execute stage-specific approved SKILL.md procedures in the pinned sandbox.
4. Produce actual files matching the declared output artifact schemas.
5. Invoke deterministic checks and record real exit code, tool version and evidence URI.
6. Publish PRODUCED, not ACCEPTED; wait for authorized stage decision.

## Stop and escalate
Breaking compatibility, invalid schema, unknown dependency boundary or unsupported ADR decision. Do not fabricate data, approvals or test results.
Do not modify protected verifier, release pointer, policy or credentials.
This AGENTS.md is contextual guidance, NOT authorization or model selection.
