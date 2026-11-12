# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `main` branch | ✅ Active development |
| Tagged releases | Security patches on latest only |

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Report privately via GitHub's [Security Advisories](https://github.com/Darshitpandya/ai-software-factory-contract/security/advisories/new) or by emailing the maintainer directly (find contact in the GitHub profile).

Include:
- A clear description of the vulnerability
- Steps to reproduce or a proof of concept
- The potential impact (what an attacker could achieve)
- Any suggested remediation if you have one

You will receive an acknowledgement within 72 hours and a status update within 7 days.

## Threat model

This project's security properties depend on the following assumptions holding. If any are violated, the security guarantees described in the README no longer apply.

| Assumption | What breaks if violated |
|---|---|
| The trusted verifier repo is separately owned; the factory producer has no write access | Producer could modify the acceptance policy or impersonate the check App |
| GitHub branch protection is configured to require `factory-contract/acceptance` from the **verifier App** specifically | A producer-controlled check could satisfy the requirement |
| `factory-releases/active.yaml` is only modified through `pnpm factory promote` after a valid PromotionDecision | Factory configuration changes bypass the evaluation gate |
| Credentials are injected at runtime; none appear in committed files, PRs, or agent prompts | Credential exposure or privilege escalation |
| The OpenSandbox/local-docker sandbox destroys the workspace after each stage | Long-running secrets or artifacts leak across stages or runs |

## Credential handling

All API credentials must be:
- Stored as GitHub Actions secrets (CI) or in `.env` (local, excluded from git)
- Read from `process.env` at runtime
- Redacted before any logging or Port status update
- Never placed in a commit, a PR body, an agent tool call, or a skill's output artifact

The `ANTHROPIC_API_KEY` is handled exclusively in the trusted coordinator process and is never forwarded to the OpenSandbox workspace or any agent-readable output.

## Verifier trust boundary

The `ai-factory-trusted-verifier` is intentionally separate from this repository. Its security properties are:
- Webhook signature validated (HMAC-SHA256) before any processing
- Delivery IDs deduplicated to prevent replay
- Policy files loaded from the verifier's own protected branch, never from the PR head
- `oasdiff` binary is pinned in the Dockerfile; no user-supplied commands are executed
- The verifier's GitHub App identity cannot be impersonated by the producer App

A PR that modifies the verifier's acceptance logic, policy files, or Dockerfile requires review by the security/verification team (see CODEOWNERS in that repository).

## Known limitations

- Branch ruleset enforcement of the specific source App identity requires GitHub Pro or higher in some repository configurations. If this cannot be enforced, run `pnpm factory doctor` — it prints `INDEPENDENT_ENFORCEMENT_UNAVAILABLE` and disables the strong verification claim.
- The `local-dev` profile uses local temp directories instead of a hardened sandbox. It is not suitable for running untrusted work orders.
- PostgreSQL is used for durable state but the deployment guide does not currently cover database encryption at rest. Hardened deployments should enable this independently.
