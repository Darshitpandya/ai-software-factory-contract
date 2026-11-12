# Product & Requirements Factory — Working Instructions

Owner: designated product-requirements domain owner (resolve identity from Port; do not invent).
Scope: the `product-requirements` production stage of the versioned Factory Contract.
Input: Port WorkOrder, service owner, accepted product context.
Output: product-spec.md, acceptance.yaml, work-items.json.

## Real commands
- `pnpm exec tsx factories/product-requirements/scripts/verify-requirements.ts`
- `pnpm factory registry:verify`

## Engineering procedure
1. Verify input artifact SHA-256, repository base SHA and stage's FactoryRelease digest.
2. Resolve only the approved Port context sources and stage MCP allowlist.
3. Execute stage-specific approved SKILL.md procedures in the pinned sandbox.
4. Produce actual files matching the declared output artifact schemas.
5. Invoke deterministic checks and record real exit code, tool version and evidence URI.
6. Publish PRODUCED, not ACCEPTED; wait for authorized stage decision.

## Stop and escalate
Missing ownership, unclear approval, untestable requirement or unsupported product assertion. Do not fabricate data, approvals or test results.
Do not modify protected verifier, release pointer, policy or credentials.
This AGENTS.md is contextual guidance, NOT authorization or model selection.
