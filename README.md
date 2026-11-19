# AI Software Factory Contract

<img src="docs/diagrams/banner-light.png#gh-light-mode-only" width="100%" alt="AI Software Factory Contract - Build once. Verify every run. Evolve safely."/>
<img src="docs/diagrams/banner-dark.png#gh-dark-mode-only" width="100%" alt="AI Software Factory Contract - Build once. Verify every run. Evolve safely."/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Factory Release](https://img.shields.io/badge/Factory%20Release-1.4.0%20active-brightgreen?style=flat-square)](factory-releases/1.4.0/factory-release.yaml)
[![CI](https://github.com/Darshitpandya/ai-software-factory-contract/actions/workflows/verify-repo.yml/badge.svg)](https://github.com/Darshitpandya/ai-software-factory-contract/actions/workflows/verify-repo.yml)
[![15 Skills](https://img.shields.io/badge/Skills-15%20locked-blueviolet?style=flat-square)](factory-releases/skills.lock.json)
[![Claude](https://img.shields.io/badge/Claude-sonnet%20%7C%20opus%20%7C%20haiku-5B21B6?style=flat-square)](docs/models.md)
[![Port](https://img.shields.io/badge/Port-control%20plane-0096FF?style=flat-square)](https://app.getport.io)

**Build Once · Verify Every Run · Evolve Safely**

A production-oriented engineering factory: a `WorkOrder` moves through five specialised stages, each producing independently verified artifacts, until a trusted verifier the producer cannot control either accepts or blocks the final handoff.

> [!IMPORTANT]
> **Two operating terms coined here by [Darshit Pandya](https://www.linkedin.com/in/darshitpandya/) - FactoryRun and FactoryRelease**
>
> The engineering community has established the term *AI software factory*. This work proposes two precise operating terms that give the concept its governance structure.
>
> **FactoryRun** - the complete journey of one work order through the factory: its stages, attempts, artifacts, acceptance decisions, and evidence. *Answers: what happened?*
>
> **FactoryRelease** - the approved, versioned factory configuration that produced that run: models, skills, tools, permissions, workflow, and sandbox, all pinned. *Answers: which machinery produced it?*
>
> A green agent status answers neither question. Independent proof is required for both.

**The factory control plane in action:**

![Port control plane tour](docs/diagrams/port-control-plane-tour.gif)

[Get started](#quick-start) · [Architecture](#architecture) · [Commands](#commands-reference) · [Port setup](#port-setup) · [Adopt this](#adopter-guide) · [Contributing](CONTRIBUTING.md) · [Models](docs/models.md)

---

## What this is

<img src="docs/diagrams/s07-two-release-contracts-light.png#gh-light-mode-only" alt="Two release contracts" width="860">
<img src="docs/diagrams/s07-two-release-contracts-dark.png#gh-dark-mode-only" alt="Two release contracts" width="860">

Two independent contracts govern the system. Contract One controls what the factory produces - engineering changes, artifacts, PRs. Contract Two controls the factory itself - model selection, skill versions, evaluation, promotion. Neither contract can satisfy the other's acceptance requirements.

<img src="docs/diagrams/s19-five-interfaces-light.png#gh-light-mode-only" alt="Five Factory Contract interfaces" width="860">
<img src="docs/diagrams/s19-five-interfaces-dark.png#gh-dark-mode-only" alt="Five Factory Contract interfaces" width="860">

Five interfaces define the boundary at every handoff: **WorkOrder**, **Artifact & Handoff**, **Execution**, **Acceptance & Evidence**, **FactoryRelease**. A contract is not a prompt. It is an executable agreement among a producer, a consumer, and the systems authorised to decide.

---

## Architecture

<img src="docs/diagrams/s09-five-factories-pipeline-light.png#gh-light-mode-only" alt="Five factories, one production value stream" width="860">
<img src="docs/diagrams/s09-five-factories-pipeline-dark.png#gh-dark-mode-only" alt="Five factories, one production value stream" width="860">

<img src="docs/diagrams/s14-three-authorities-light.png#gh-light-mode-only" alt="Control, execution and acceptance are separate authorities" width="860">
<img src="docs/diagrams/s14-three-authorities-dark.png#gh-dark-mode-only" alt="Control, execution and acceptance are separate authorities" width="860">

Port does not replace GitHub merge rules. An agent does not set its own acceptance criteria. A local test is not an authoritative repository check. In this reference implementation the coordinator runs on a workstation; in production it is a deployed service.

<img src="docs/diagrams/s13-blueprint-light.gif#gh-light-mode-only" alt="Factory blueprint - the contract at every boundary crossing" width="860">
<img src="docs/diagrams/s13-blueprint-dark.gif#gh-dark-mode-only" alt="Factory blueprint - the contract at every boundary crossing" width="860">

<img src="docs/diagrams/s15-tool-ecosystem-light.png#gh-light-mode-only" alt="Existing tools, clear responsibilities" width="860">
<img src="docs/diagrams/s15-tool-ecosystem-dark.png#gh-dark-mode-only" alt="Existing tools, clear responsibilities" width="860">

<img src="docs/diagrams/s18-execution-lifecycle-light.gif#gh-light-mode-only" alt="From resolved contract to recorded evidence" width="860">
<img src="docs/diagrams/s18-execution-lifecycle-dark.gif#gh-dark-mode-only" alt="From resolved contract to recorded evidence" width="860">

<img src="docs/diagrams/s11-factoryrun-hierarchy-light.png#gh-light-mode-only" alt="FactoryRun accountability hierarchy" width="860">
<img src="docs/diagrams/s11-factoryrun-hierarchy-dark.png#gh-dark-mode-only" alt="FactoryRun accountability hierarchy" width="860">

A producing stage cannot unilaterally certify its own downstream readiness. Every object links to a FactoryRun, a FactoryRelease, a target repository, and the relevant acceptance record.

### Component map

```
packages/
  contract-types/     TypeScript interfaces for all factory records
  port-client/        Port API: token renewal, entity upsert, action run reporting
  github-client/      GitHub App: file reads + PR creation (producer App, scoped)
  state-machine/      PostgreSQL-backed stages, leases, idempotency, retries
  claude-executor/    Anthropic SDK agentic loop; loads AGENTS.md + SKILL.md per stage
  sandbox-adapter/    Local temp dirs (dev) or OpenSandbox API (CI/hardened)
  artifact-store/     SHA-256 bundle collection and evidence persistence
  acceptance-client/  Polls GitHub Checks API for factory-contract/acceptance verdict

apps/
  factory-cli/          CLI: doctor, run, resume, evaluate, promote, port:apply, teardown
  factory-coordinator/  Stateful coordinator worker; PostgreSQL leases, outbox, retries

factories/
  product-requirements/   AGENTS.md, 3xSKILL.md, acceptance.yaml, verify script
  software-architecture/  AGENTS.md, 3xSKILL.md, acceptance.yaml, verify script
  software-engineering/   AGENTS.md, 3xSKILL.md, acceptance.yaml, verify script
  security-compliance/    AGENTS.md, 3xSKILL.md, acceptance.yaml, verify script
  platform-operations/    AGENTS.md, 3xSKILL.md, acceptance.yaml, verify script

factory-releases/
  1.4.0/factory-release.yaml   ACTIVE - per-stage model assignments + sandbox config
  1.5.0/factory-release.yaml   CANDIDATE - arch + eng use claude-fable-5-2
  active.yaml                  Protected pointer; update only via pnpm factory promote
  skills.lock.json             Real SHA-256 digests for all 15 skills
```

---

## The Four Repositories

<img src="docs/diagrams/s46-reuse-across-repositories-light.png#gh-light-mode-only" alt="One factory release, two repository contracts" width="860">
<img src="docs/diagrams/s46-reuse-across-repositories-dark.png#gh-dark-mode-only" alt="One factory release, two repository contracts" width="860">

| Repo | Role |
|------|------|
| **This repo** | Factory engine - contracts, coordinator, executor, 5 stages, evaluation, CLI |
| [`ai-factory-trusted-verifier`](https://github.com/Darshitpandya/ai-factory-trusted-verifier) | Independently owned verifier - GitHub App, oasdiff, protected policies |
| [`factory-reference-billing-api`](https://github.com/Darshitpandya/factory-reference-billing-api) | TypeScript consumer - invoice export, the breaking-change demo |
| [`factory-reference-notification-api`](https://github.com/Darshitpandya/factory-reference-notification-api) | Python consumer - event schema, PII controls, reuse proof |

The trust boundary: the billing and notification repos require `factory-contract/acceptance` from the **verifier's GitHub App** - the producer App cannot satisfy it.

---

## Quick Start

**Prerequisites:** Node.js >= 22, pnpm >= 9, Docker, PostgreSQL, Port org, Anthropic API key.

```bash
git clone https://github.com/Darshitpandya/ai-software-factory-contract.git
cd ai-software-factory-contract
pnpm install
cp .env.example .env          # fill in PORT_*, ANTHROPIC_API_KEY, DATABASE_URL
docker compose -f infra/local/docker-compose.yaml up -d
pnpm bootstrap                 # migrations -> skills.lock -> Port entities -> registry verify
pnpm factory doctor --profile local-dev
```

Start the coordinator (keeps running, picks up work orders automatically):

```bash
nohup node_modules/.bin/tsx apps/factory-coordinator/src/index.ts > /tmp/coordinator.log 2>&1 &
```

Trigger a factory run from Port (create a WorkOrder entity, click **Trigger Factory Run**) or from the CLI:

```bash
pnpm factory run --work-order wo-billing-invoice-export-001 --release 1.4.0
```

---

## Commands Reference

```bash
# Health
pnpm factory doctor --profile local-dev

# Factory runs
pnpm factory run --work-order <id> --release 1.4.0
pnpm factory run --work-order <id> --release 1.4.0 --dry-run
pnpm factory resume --run-id <uuid>

# Port control plane
pnpm factory port:plan
pnpm factory port:apply

# Skills registry
pnpm factory registry:verify
pnpm lock-components

# Evaluation
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory evaluation:report --comparison <id>

# Promotion
pnpm factory promote --candidate 1.5.0 --decision <id>

# Evidence
pnpm factory evidence:verify --run-id <uuid>

# CI
pnpm typecheck && pnpm lint && pnpm test
```

---

## Factory Release Model Assignments

**Release 1.4.0 (ACTIVE)** - per-stage assignments, not a single model:

| Stage | Model | Rationale |
|-------|-------|-----------|
| `product-requirements` | `claude-sonnet-5-5` | Requirements: creative + structured |
| `software-architecture` | `claude-opus-5-5` | ADRs + OpenAPI: deep reasoning |
| `software-engineering` | `claude-opus-5-5` | Code + tests: long-horizon |
| `security-compliance` | `claude-sonnet-5-5` | Policy matching: fast + structured |
| `platform-operations` | `claude-haiku-5-5` | Health checks: fast + cheap |

Pricing: opus $15/$75 · sonnet $3/$15 · haiku $0.25/$1.25 per million tokens.
Typical cost per 5-stage run: **~$2.10**. See [docs/models.md](docs/models.md) for the full guide.

**Release 1.5.0 (CANDIDATE):**
```yaml
stageModels:
  software-architecture: claude-fable-5-2
  software-engineering:  claude-fable-5-2
  # other stages fall back to defaultModel: claude-opus-5-5
```

---

## Port Setup

Port is the control plane. Three steps for a fresh org:

**1. Blueprints - Terraform**
```bash
cd infra/terraform && cp terraform.tfvars.example terraform.tfvars
# Fill in: port_client_id, port_client_secret, github_token, github_owner
terraform init && terraform apply
```

**2. Pages - restore script**
```bash
export PORT_CLIENT_ID=... PORT_CLIENT_SECRET=...
python3 control-plane/port/apply-pages.py
```

**3. Data - backfill after runs**
```bash
python3 scripts/backfill-port-runs.py
```

### Blueprints

| Blueprint | Purpose |
|-----------|---------|
| `service` | A deployable service tracked by the factory |
| `workOrder` | A versioned engineering intent |
| `factoryRelease` | A pinned, locked factory configuration |
| `factoryRun` | End-to-end execution and evidence record |
| `promotionDecision` | Recorded promote / hold / reject decision |
| `factoryComponent` | Skill, MCP tool, sandbox image in the registry |
| `factorySkill` | Individual skill with SHA-256 digest |

### Self-service actions

| Action | Blueprint | Workflow |
|--------|-----------|---------|
| `createWorkOrder` | workOrder | `factory-run.yml` |
| `triggerFactoryRun` | workOrder | `factory-run.yml` |
| `resumeFactoryRun` | factoryRun | `factory-retry.yml` |
| `approveStage` | factoryRun | `factory-run.yml` |
| `cancelFactoryRun` | factoryRun | `factory-retry.yml` |
| `runFactoryEvaluation` | factoryRelease | `factory-eval.yml` |
| `promoteFactoryRelease` | factoryRelease | `factory-promote.yml` |

### Getting Port credentials

1. `app.getport.io` -> Organization Settings -> Credentials -> create machine account
2. Copy `clientId` and `clientSecret`
3. Set as GitHub secrets `PORT_CLIENT_ID` and `PORT_CLIENT_SECRET`

---

## GitHub Apps Setup

Two Apps required for the independent acceptance boundary:

| App | Owned by | Permissions | Installs on |
|-----|---------|-------------|-------------|
| Producer App | This repo | `contents:read`, `pull_requests:write`, `actions:write` | Consumer repos |
| Verifier App | `ai-factory-trusted-verifier` | `contents:read`, `checks:write`, `pull_requests:read` | Consumer repos |

After install, set branch protection on consumer repos: add `factory-contract/acceptance` as a required check and **restrict its source to the Verifier App identity**.

See [`infra/github/`](infra/github/README.md) for setup scripts.

---

## AAIF Projects

Three AAIF projects are directly used in this factory. The [Agentic AI Foundation](https://aaif.io/) is a [Linux Foundation](https://www.linuxfoundation.org/) initiative co-founded by Anthropic, OpenAI, and Block.

<table>
  <tr>
    <td align="center" width="100">
      <a href="https://modelcontextprotocol.io">
        <img src="https://github.com/modelcontextprotocol.png?size=64" width="64" height="64" alt="MCP"/>
        <br/><b>MCP</b>
      </a>
    </td>
    <td>
      <b>Model Context Protocol</b> &nbsp;·&nbsp; <a href="https://github.com/modelcontextprotocol">github.com/modelcontextprotocol</a><br/>
      Every tool integration in this factory - Port context, GitHub operations, security scanners - goes through MCP. <code>tools.lock.json</code> pins the approved MCP server identities and tool names for each stage.
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://agents.md">
        <img src="https://github.com/agentsmd.png?size=64" width="64" height="64" alt="AGENTS.md"/>
        <br/><b>AGENTS.md</b>
      </a>
    </td>
    <td>
      <b>AGENTS.md</b> &nbsp;·&nbsp; <a href="https://github.com/agentsmd/agents.md">github.com/agentsmd/agents.md</a><br/>
      Each of the five factories ships a dedicated <code>AGENTS.md</code> file - build commands, path boundaries, conventions, do-not-modify areas - loaded by the <code>claude-executor</code> package before every stage run.
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://agentskills.io">
        <img src="https://github.com/agentskills.png?size=64" width="64" height="64" alt="Agent Skills"/>
        <br/><b>Agent Skills</b>
      </a>
    </td>
    <td>
      <b>Agent Skills (SKILL.md)</b> &nbsp;·&nbsp; <a href="https://github.com/agentskills/agentskills">github.com/agentskills/agentskills</a><br/>
      15 skills locked in <code>skills.lock.json</code>, 3 per factory stage. Each is a <code>SKILL.md</code> file teaching the agent one workflow: requirements analysis, ADR authoring, feature implementation, security review, incident triage, and more. Donated to AAIF by Anthropic on 22 October 2026.
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/opensandbox-group/OpenSandbox">
        <img src="https://github.com/opensandbox-group.png?size=64" width="64" height="64" alt="OpenSandbox"/>
        <br/><b>OpenSandbox</b>
      </a>
    </td>
    <td>
      <b>OpenSandbox</b> &nbsp;·&nbsp; <a href="https://github.com/opensandbox-group/OpenSandbox">github.com/opensandbox-group/OpenSandbox</a><br/>
      Isolated execution environment for every factory stage. <code>sandbox-adapter</code> implements the <code>OpenSandboxClient</code>; <code>factory-release.yaml</code> pins the provider and image digest. AAIF project at <a href="https://aaif.io/projects/opensandbox">aaif.io/projects/opensandbox</a>.
    </td>
  </tr>
</table>

---

## Technology Stack

All tools used in this reference implementation.

<table>
  <tr>
    <td align="center" width="100">
      <a href="https://www.getport.io">
        <img src="https://github.com/port-labs.png?size=56" width="56" height="56" alt="Port"/>
        <br/><b>Port</b>
      </a><br/><sub>AI software factory<br/>control plane · Context lake</sub>
    </td>
    <td align="center" width="100">
      <a href="https://github.com">
        <img src="https://github.com/github.png?size=56" width="56" height="56" alt="GitHub"/>
        <br/><b>GitHub</b>
      </a><br/><sub>Workflows · CI/CD</sub>
    </td>
    <td align="center" width="100">
      <a href="https://claude.ai">
        <img src="https://cdn.simpleicons.org/claude/CC785C" width="56" height="56" alt="Claude"/>
        <br/><b>Claude</b>
      </a><br/><sub>AI execution engine</sub>
    </td>
    <td align="center" width="100">
      <a href="https://github.com/opensandbox-group/OpenSandbox">
        <img src="https://github.com/opensandbox-group.png?size=56" width="56" height="56" alt="OpenSandbox"/>
        <br/><b>OpenSandbox</b>
      </a><br/><sub>Isolated runtime · AAIF</sub>
    </td>
    <td align="center" width="100">
      <a href="https://modelcontextprotocol.io">
        <img src="https://github.com/modelcontextprotocol.png?size=56" width="56" height="56" alt="MCP"/>
        <br/><b>MCP</b>
      </a><br/><sub>Tool protocol · AAIF</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://agents.md">
        <img src="https://github.com/agentsmd.png?size=56" width="56" height="56" alt="AGENTS.md"/>
        <br/><b>AGENTS.md</b>
      </a><br/><sub>Instructions · AAIF</sub>
    </td>
    <td align="center">
      <a href="https://agentskills.io">
        <img src="https://github.com/agentskills.png?size=56" width="56" height="56" alt="Agent Skills"/>
        <br/><b>Agent Skills</b>
      </a><br/><sub>SKILL.md · AAIF</sub>
    </td>
    <td align="center">
      <a href="https://www.postgresql.org">
        <img src="https://cdn.simpleicons.org/postgresql/4169E1" width="56" height="56" alt="PostgreSQL"/>
        <br/><b>PostgreSQL</b>
      </a><br/><sub>State · leases</sub>
    </td>
    <td align="center">
      <a href="https://www.docker.com">
        <img src="https://cdn.simpleicons.org/docker/2496ED" width="56" height="56" alt="Docker"/>
        <br/><b>Docker</b>
      </a><br/><sub>Local dev</sub>
    </td>
    <td align="center">
      <a href="https://www.typescriptlang.org">
        <img src="https://cdn.simpleicons.org/typescript/3178C6" width="56" height="56" alt="TypeScript"/>
        <br/><b>TypeScript</b>
      </a><br/><sub>Packages · CLI</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <a href="https://www.python.org">
        <img src="https://cdn.simpleicons.org/python/3776AB" width="56" height="56" alt="Python"/>
        <br/><b>Python</b>
      </a><br/><sub>Scripts · ops</sub>
    </td>
  </tr>
</table>

---

## Evolving the Factory

<img src="docs/diagrams/s39-two-release-decisions-light.png#gh-light-mode-only" alt="Two release decisions kept independent" width="860">
<img src="docs/diagrams/s39-two-release-decisions-dark.png#gh-dark-mode-only" alt="Two release decisions kept independent" width="860">

<img src="docs/diagrams/s42-promotion-policy-light.png#gh-light-mode-only" alt="A mandatory regression defeats a performance advantage" width="860">
<img src="docs/diagrams/s42-promotion-policy-dark.png#gh-dark-mode-only" alt="A mandatory regression defeats a performance advantage" width="860">

<img src="docs/diagrams/s44-factory-economics-light.png#gh-light-mode-only" alt="Measure the factory as a production system" width="860">
<img src="docs/diagrams/s44-factory-economics-dark.png#gh-dark-mode-only" alt="Measure the factory as a production system" width="860">

Measure accepted work-order throughput, lead time, rework rate, and cost per accepted change - not token consumption or lines of code generated.

---

## Adopter Guide

Using this factory for a **different repository**:

1. Add `.factory/repository-contract.yaml` (see `contracts/schemas/repository-contract.schema.json`)
2. Add `.factory/work-orders/your-feature.yaml` for each work order
3. Add `AGENTS.md` with factual workspace instructions (build commands, path boundaries, do-not-modify areas)
4. Install both GitHub Apps and configure branch protection with the verifier's `factory-contract/acceptance` check
5. Create a `service` entity in Port pointing to your repo

You do **not** copy any orchestration code. The factory runs against your repo remotely.

---

## What this proves

<img src="docs/diagrams/s48-seven-proofs-light.png#gh-light-mode-only" alt="Three promises, seven proofs" width="860">
<img src="docs/diagrams/s48-seven-proofs-dark.png#gh-dark-mode-only" alt="Three promises, seven proofs" width="860">

---

## Security

- Bring your own credentials - Port org, Anthropic API key, GitHub App private keys; none are provided or stored here
- The trusted verifier runs in a separate repo under separate ownership
- Each stage's acceptance is set by the verifier or an authorised human - never by the stage executor
- `factory-releases/active.yaml` is updated only via `pnpm factory promote` after a valid `PromotionDecision`

See [SECURITY.md](SECURITY.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT - see [LICENSE](LICENSE). Your `WorkOrder` contents, `AGENTS.md`, and produced artifacts are yours.
