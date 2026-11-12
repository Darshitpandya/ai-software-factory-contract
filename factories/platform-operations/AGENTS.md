# Platform, DevOps & Self-Healing Factory — Working Instructions

Owner: designated platform-operations domain owner (resolve identity from Port; do not invent).
Scope: the `platform-operations` production stage of the versioned Factory Contract.
Input: accepted release, deployment policy, owner, SLO and telemetry context.
Output: deployment.json, health-evidence.json, incident/rollback record.

## Real commands
- `pnpm exec tsx factories/platform-operations/scripts/verify-deployment.ts`
- `pnpm factory registry:verify`

## Engineering procedure
1. Verify input artifact SHA-256, repository base SHA and stage's FactoryRelease digest.
2. Resolve only the approved Port context sources and stage MCP allowlist.
3. Execute stage-specific approved SKILL.md procedures in the pinned sandbox.
4. Produce actual files matching the declared output artifact schemas.
5. Invoke deterministic checks and record real exit code, tool version and evidence URI.
6. Publish PRODUCED, not ACCEPTED; wait for authorized stage decision.

## Stop and escalate
Unapproved deployment, missing health observation, no rollback target or unauthorized production write. Do not fabricate data, approvals or test results.
Do not modify protected verifier, release pointer, policy or credentials.
This AGENTS.md is contextual guidance, NOT authorization or model selection.
