# AI Software Factory Contract

**Build Once · Verify Every Run · Evolve Safely**

A production-oriented engineering factory that takes a `WorkOrder` through five real production capabilities — Product & Requirements, Software Architecture, Software Engineering, Security & Compliance, and Platform & Operations — publishes independently validated artifacts at each handoff, and blocks an unacceptable PR under a verifier the producer cannot control.

[Get started](#quick-start) · [Architecture](#architecture) · [All commands](#commands-reference) · [Port setup](#port-setup) · [Extend to your repo](#adopter-guide) · [Contributing](CONTRIBUTING.md)

---

## What this is

This is not an agent framework, a CI/CD replacement, or a governance tool. It is a **versioned production factory**:

- Five specialized production stages each produce artifact evidence; none accepts its own output.
- An independent trusted verifier runs `oasdiff` against the OpenAPI baseline and posts a `factory-contract/acceptance` GitHub check the factory producer cannot forge.
- Every factory configuration is a versioned `FactoryRelease`. Promoting a candidate requires measured evaluation against fixed workloads, not an AI opinion.
- A second consumer repository (`factory-reference-notification-api`, Python) uses the same factory release, proving the production machinery is reusable — not a one-off workflow.

```
Port Control Plane + Context Lake
        │
        ▼
  WorkOrder Resolution
        │
        ▼
  GitHub Actions: factory-run.yml
        │
        ▼
  Factory Coordinator (Node.js, PostgreSQL-backed)
        │
   ┌────┴────────────────────────────────┐
   │  Claude Agent SDK                   │
   │  AGENTS.md  SKILL.md   MCP tools    │
   │                │                    │
   │         OpenSandbox                 │
   │         (isolated execution)        │
   └──────────────────────────────────── ┘
        │
        ▼
  Stage Artifacts → PR → GitHub Check
        │
        ▼
  Trusted Verifier (separate repo, separate App)
  factory-contract/acceptance: success | failure
        │
        ▼
  Next Stage or BLOCKED
```

---

## The Four Repositories

| Repo | Role | Owner |
|---|---|---|
| **This repo** | Factory contracts, Port model, coordinator, Claude executor, 5 stages, evaluation, CLI | Platform/factory owners |
| [`ai-factory-trusted-verifier`](https://github.com/Darshitpandya/ai-factory-trusted-verifier) | Independently owned verifier — GitHub App, oasdiff, protected policies | Security/verification owners (separate from producer) |
| [`factory-reference-billing-api`](https://github.com/Darshitpandya/factory-reference-billing-api) | TypeScript reference consumer — tenant-scoped invoice export, the breaking-change demo | Billing domain |
| [`factory-reference-notification-api`](https://github.com/Darshitpandya/factory-reference-notification-api) | Python reference consumer — proves factory reuse with event schema, PII, delivery | Notifications domain |

The trust boundary that makes the demo real: the billing and notification repos require the `factory-contract/acceptance` check from the **verifier's GitHub App** — the factory producer's App identity cannot satisfy that requirement.

---

## Architecture

### Five production stages

```
  WorkOrder
      │
      ▼
┌─────────────────────────────────┐
│ 1. Product & Requirements       │  output: product-spec.md, acceptance.yaml, work-items.json
│    skills: requirements-analysis│
│            acceptance-criteria  │
│            work-decomposition   │
└──────────────┬──────────────────┘
               │ ACCEPTED
               ▼
┌─────────────────────────────────┐
│ 2. Software Architecture        │  output: adr-0007-*.md, openapi.yaml, architecture-evidence.json
│    skills: architecture-options │
│            adr-authoring        │
│            openapi-contract     │
└──────────────┬──────────────────┘
               │ ACCEPTED
               ▼
┌─────────────────────────────────┐
│ 3. Software Engineering         │  output: source PR, test-results.json, execution-manifest.json
│    skills: feature-implementation│            ⬆ this is what the verifier checks
│            test-driven-change   │
│            safe-refactor        │
└──────────────┬──────────────────┘
               │ factory-contract/acceptance (from TRUSTED VERIFIER — not from this repo)
               ▼
┌─────────────────────────────────┐
│ 4. Security & Compliance        │  output: security-findings.json, scan-evidence.json
│    skills: security-review      │
│            vulnerability-remediation
│            compliance-evidence  │
└──────────────┬──────────────────┘
               │ ACCEPTED
               ▼
┌─────────────────────────────────┐
│ 5. Platform & Operations        │  output: deployment.json, health-evidence.json
│    skills: release-assessment   │
│            incident-triage      │
│            remediation-plan     │
└──────────────┬──────────────────┘
               │ ACCEPTED
               ▼
         FactoryRun: COMPLETED
         (visible in Port)
```

### Component map

```
packages/
  contract-types/     TypeScript interfaces for all factory records
  port-client/        Port API: token renewal, entity upsert, action run reporting
  github-client/      GitHub App: read + PR create (producer App, scoped)
  state-machine/      PostgreSQL-backed stages, leases, idempotency, retries
  claude-executor/    @anthropic-ai/sdk agentic loop; loads AGENTS.md + SKILL.md per stage
                      Model resolved from FactoryRelease: stageModels[stage] ?? defaultModel
  sandbox-adapter/    Local-docker (dev) or OpenSandbox API (CI/hardened)
  artifact-store/     SHA-256 bundle collection and evidence persistence
  acceptance-client/  Polls GitHub Checks API for factory-contract/acceptance verdict

apps/
  factory-cli/        CLI: doctor, run, resume, evaluate, promote, port:apply, teardown
  factory-coordinator/  Stateful coordinator worker; PostgreSQL leases, outbox, retries
  factory-stage-runner/ Scoped per-stage process invoked by coordinator

factories/
  product-requirements/   AGENTS.md, 3×SKILL.md, verify-requirements.ts, workflow.yaml
  software-architecture/  AGENTS.md, 3×SKILL.md, verify-architecture.ts
  software-engineering/   AGENTS.md, 3×SKILL.md, verify-engineering.ts
  security-compliance/    AGENTS.md, 3×SKILL.md, verify-security.ts
  platform-operations/    AGENTS.md, 3×SKILL.md, verify-deployment.ts

factory-releases/
  1.4.0/factory-release.yaml   ACTIVE — sonnet-5-5 (requirements/security) + opus-5-5 (architecture/engineering) + haiku-5-5 (platform-ops)
  1.5.0/factory-release.yaml   CANDIDATE — fable-5-2 for architecture+engineering; others unchanged
  active.yaml                  Protected pointer; only updated via pnpm factory promote
  skills.lock.json             Real SHA-256 digests for all 15 skills (run pnpm lock-components)
  tools.lock.json              MCP endpoint identities + approved tool names
```

---

## Quick Start

**Prerequisites:** Node.js ≥ 22, pnpm ≥ 9, Docker, a PostgreSQL instance, Port organization, Anthropic API key, GitHub account.

### 1. Clone and install

```bash
git clone https://github.com/Darshitpandya/ai-software-factory-contract.git
cd ai-software-factory-contract
pnpm install
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
PORT_CLIENT_ID=your-port-client-id
PORT_CLIENT_SECRET=your-port-client-secret
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://factory:factory@localhost:5432/factory
```

### 3. Start local infrastructure

```bash
docker compose -f infra/local/docker-compose.yaml up -d
# PostgreSQL starts on :5432, coordinator on :3001
```

### 4. Bootstrap

```bash
pnpm bootstrap
# Runs: DB migrations → skills.lock.json → Port entities → registry verify
```

### 5. Check everything

```bash
pnpm factory doctor --profile local-dev
```

Expected output: all green except GitHub App (optional for local-dev) and OpenSandbox (falls back to local temp directories).

### 6. Apply Port control plane

```bash
pnpm factory port:apply
# Creates: service entities, factory release entities (1.4.0 + 1.5.0)
```

### 7. Run a factory

```bash
# Create a WorkOrder in Port UI → it dispatches factory-run.yml
# Or trigger locally (requires Port WorkOrder entity to exist):
pnpm factory run --work-order wo-billing-invoice-export-001 --release 1.4.0
```

Watch progress at `app.getport.io` → Catalog → Factory Runs.

---

## Commands Reference

```bash
# Health and setup
pnpm factory doctor --profile local-dev        # check all prerequisites
pnpm factory doctor --profile ci-integration   # stricter: OpenSandbox required
pnpm bootstrap                                  # one-time: migrations + lock + Port + registry

# Port control plane
pnpm factory port:plan                          # show planned diffs, no mutation
pnpm factory port:apply                         # idempotent Port entity creation

# Skills registry
pnpm factory registry:verify                   # SHA-256 verify all 15 skills
pnpm lock-components                           # recompute + write skills.lock.json

# Factory runs
pnpm factory run --work-order <id> --release 1.4.0
pnpm factory run --work-order <id> --release 1.4.0 --dry-run   # resolve only
pnpm factory resume --run-id <id>              # idempotent; skips already-accepted stages

# Evaluation
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory evaluation:report --comparison <id>

# Promotion
pnpm factory promote --candidate 1.5.0 --decision <id>

# Evidence
pnpm factory evidence:verify --run-id <id>

# CI
pnpm typecheck
pnpm lint
pnpm test                                       # vitest --passWithNoTests

# Teardown
pnpm factory teardown --profile local-dev       # stop Docker, clean sandbox temps
```

All commands exit nonzero on failure, write machine-readable JSON where applicable, and use the same schemas as the API.

---

## Port Setup

Port is the control plane: it holds the catalog, owns workflow dispatch, and surfaces run visibility to your team.

### Blueprints (auto-created by `pnpm factory port:apply`)

| Blueprint | Purpose |
|---|---|
| `service` | A deployable service tracked by the factory |
| `workOrder` | A versioned engineering intent |
| `factoryRelease` | A pinned, locked factory configuration |
| `factoryRun` | End-to-end execution and evidence record |
| `promotionDecision` | Recorded promote / hold / reject decision |
| `factoryComponent` | Skill, MCP tool, sandbox image in the registry |

### Actions (created in Port, dispatch GitHub workflows)

| Action | Blueprint | Workflow |
|---|---|---|
| `createWorkOrder` | workOrder | `factory-run.yml` |
| `resumeFactoryRun` | factoryRun | `factory-retry.yml` |
| `evaluateRelease` | factoryRelease | `factory-eval.yml` |

### Getting Port credentials

1. Go to `app.getport.io` → Organization Settings → Credentials
2. Create a machine account; copy `clientId` and `clientSecret`
3. Store as GitHub secrets `PORT_CLIENT_ID` and `PORT_CLIENT_SECRET`

---

## GitHub Apps Setup

Two Apps are required for the independent acceptance boundary to work.

### Producer App (factory repo)
Permissions: `contents:read`, `pull_requests:write`, `actions:write`, `metadata:read`
Install on: `factory-reference-billing-api`, `factory-reference-notification-api`

### Verifier App (trusted verifier repo)
Permissions: `contents:read`, `checks:write`, `pull_requests:read`, `metadata:read`
Install on: `factory-reference-billing-api`, `factory-reference-notification-api`

After both Apps are installed and the verifier has posted its first check:

1. Go to repo Settings → Branches → edit main branch protection
2. Under Required status checks → add `factory-contract/acceptance`
3. Under **Require status from**, select the **Verifier App** (not the producer App and not GitHub Actions)

This is the enforcement that prevents the producer from forging the acceptance verdict.

---

## Configuration Reference

| Variable | Required | Description |
|---|---|---|
| `PORT_CLIENT_ID` | Yes | Port machine account client ID |
| `PORT_CLIENT_SECRET` | Yes | Port machine account client secret |
| `PORT_BASE_URL` | No | Defaults to `https://api.getport.io` |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude executor |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_APP_ID` | For PR stage | Producer GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY_PATH` | For PR stage | Path to App private key (filesystem, not env) |
| `GITHUB_APP_INSTALLATION_ID` | For PR stage | Installation ID |
| `GITHUB_APP_WEBHOOK_SECRET` | For PR stage | Webhook HMAC secret |
| `OPENSANDBOX_URL` | CI/hardened | OpenSandbox service URL |
| `OPENSANDBOX_API_KEY` | CI/hardened | OpenSandbox API key |

None of these values belong in a committed file. Use `.env` locally (in `.gitignore`) and GitHub Actions secrets in CI.

---

## Factory Release Lifecycle

Factory releases are the unit of change for the production system itself.

```bash
# 1. Edit factory-releases/1.5.0/factory-release.yaml
#    Change: defaultModel, stageModels, sandbox imageDigest, skill version

# 2. Run evaluation
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory evaluation:report --comparison <id>

# 3. Review evaluation results in Port (PromotionDecision entity)

# 4. Promote (requires all hard gates passed)
pnpm factory promote --candidate 1.5.0 --decision <id>

# 5. factory-releases/active.yaml is updated — commit it
git add factory-releases/active.yaml
git commit -m "chore: promote factory release 1.5.0 [decision: <id>]"
```

A candidate that introduces a compatibility regression fails `HG-001` and cannot be promoted regardless of other scores.

---

## Adopter Guide

Using this factory for a **different repository** (not the reference billing or notification API):

1. Add `.factory/repository-contract.yaml` to your repo following the [RepositoryContract schema](contracts/schemas/repository-contract.schema.json)
2. Add `.factory/work-orders/your-feature.yaml` for each work order
3. Add `AGENTS.md` to your repo root with factual workspace instructions (build commands, path boundaries, do-not-modify areas)
4. Install the Producer GitHub App and configure branch protection with the Verifier App's `factory-contract/acceptance` check
5. Create a `service` entity in Port pointing to your repo

You do **not** copy any orchestration code into your repo. The factory runs against it remotely using the GitHub App to read code and open PRs.

---

## Operating Profiles

| Profile | Use | Key difference |
|---|---|---|
| `local-dev` | Development and learning | Local temp dirs instead of OpenSandbox, local PostgreSQL |
| `ci-integration` | GitHub Actions runs | OpenSandbox required; ephemeral credentials; no production deployment |
| `hardened` | Shared/production | Dedicated worker identity, egress restrictions, audit retention, backups |

---

## Security

Responsible disclosure: see [SECURITY.md](SECURITY.md).

Key properties:
- No credential ever enters a committed file, PR, or agent prompt
- The trusted verifier runs in a separate repo under separate ownership
- Each stage's acceptance is set by the verifier or an authorized human — never by the stage executor
- `factory-releases/active.yaml` can only be modified by `pnpm factory promote` after a valid `PromotionDecision`

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).

The factory contract, schemas, skill procedures, and coordinator logic are open source. Your own `WorkOrder` contents, `AGENTS.md`, and produced artifacts are yours.
