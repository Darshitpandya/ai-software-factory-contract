# Security Policy

## Scope

This is an open-source reference implementation of an AI Software Factory Contract. The repository contains factory contract definitions, coordinator logic, CLI tooling, and GitHub workflow examples. It does **not** ship with credentials, model API keys, or production infrastructure.

Adopters bring their own credentials (Port org, Anthropic API key, GitHub App private keys). The security model here describes the design boundaries of this reference — not the security of any adopter's deployment.

---

## Supported versions

| Version | Supported |
|---|---|
| `main` branch | ✅ Active — patches applied here |
| Tagged releases | Latest tag only |

Older tags are not patched. Pin to a specific tag only if pulling the full source and maintaining it yourself.

---

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Report privately via GitHub's built-in [Security Advisories](https://github.com/Darshitpandya/ai-software-factory-contract/security/advisories/new). This creates an encrypted, private discussion visible only to the maintainer.

Include:
- A clear description of the vulnerability
- Steps to reproduce or a minimal proof of concept
- The potential impact — what an attacker could achieve
- Any suggested remediation if available

**Response commitments:**
- Acknowledgement within 72 hours
- Status update (triaged / in progress / fixed) within 7 days

Responsible disclosure is appreciated. A CVE or advisory will be published once a fix is available.

---

## Threat model

The security properties of this reference implementation depend on the following boundaries holding. Adopters must verify each when deploying.

| Boundary | What breaks if violated |
|---|---|
| The trusted verifier repo (`ai-factory-trusted-verifier`) is separately owned; the factory producer App has no write access to it | Producer could modify acceptance policy or impersonate the verifier check |
| GitHub branch protection requires `factory-contract/acceptance` from the **verifier App identity specifically** | A producer-controlled CI job could satisfy the required check |
| `factory-releases/active.yaml` is only updated via `pnpm factory promote` after a recorded `PromotionDecision` | Factory configuration changes bypass the evaluation gate |
| Each stage runs in an isolated OpenSandbox or local-docker workspace that is destroyed after completion | Secrets or artifacts from one stage leak into another |
| MCP tool scopes in `tools.lock.json` are enforced by the runtime — not just declared in a prompt | The agent gains broader system access than the factory release authorises |

---

## Credentials and secrets

This repository contains **no credentials**. Adopters supply their own:

- `PORT_CLIENT_ID` / `PORT_CLIENT_SECRET` — Port machine account credentials
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude execution
- `FACTORY_APP_PRIVATE_KEY` — GitHub App private key for the producer App
- `VERIFIER_APP_PRIVATE_KEY` — stored in the verifier repo only, never here
- `DATABASE_URL` — PostgreSQL connection string

All secrets must be stored as GitHub Actions secrets (CI) or in a local `.env` file that is git-ignored. The `.env.example` file shows the required variable names with placeholder values only.

The `ANTHROPIC_API_KEY` is consumed exclusively in the coordinator process. It is never forwarded to the sandbox workspace, written to artifact files, or included in Port entity updates.

---

## Verifier trust boundary

The [`ai-factory-trusted-verifier`](https://github.com/Darshitpandya/ai-factory-trusted-verifier) is intentionally a separate repository under separate ownership. Its security properties:

- Webhook payloads are validated with HMAC-SHA256 before any processing
- Delivery IDs are deduplicated to prevent replay attacks
- Policy files are loaded from the verifier's own protected branch — never from the pull request head
- The `oasdiff` binary is pinned in the Dockerfile; no user-supplied commands are executed
- The verifier's GitHub App identity cannot be satisfied by the producer App

Changes to the verifier's acceptance logic, policy files, or Dockerfile require a pull request to that separate repository with its own review process.

---

## Known limitations

- **App identity enforcement:** Restricting a required status check to a specific GitHub App source requires GitHub Pro or above on some repository configurations. Run `pnpm factory doctor` — it reports `INDEPENDENT_ENFORCEMENT_UNAVAILABLE` if this cannot be verified.
- **Local-dev profile:** The `local-dev` sandbox profile uses local temp directories, not a hardened sandbox. It is unsuitable for running untrusted work orders.
- **Database encryption:** PostgreSQL deployment guidance does not currently cover encryption at rest. Hardened deployments should enable this independently.
- **Nondeterminism:** Agent outputs are nondeterministic. The factory contract governs acceptance boundaries, not bit-for-bit reproducibility.

---

## Out of scope

The following are not in scope for security reports against this repository:

- Vulnerabilities in adopters' own deployments, credentials, or infrastructure
- Claude model behaviour, jailbreaks, or prompt injection in content produced by the agent
- Port, GitHub, Anthropic, or OpenSandbox platform vulnerabilities — report those to the respective vendors
- Issues in dependency packages that have already been reported upstream
