# AI Software Factory Contract

**Build Once · Verify Every Run · Evolve Safely** — PortCon 2026

A versioned production factory that takes a `WorkOrder` through five engineering production capabilities, publishes independently validated artifacts at each handoff, and blocks an unacceptable PR under a verifier the producer cannot control.

## The Four Repositories

| Repository | Role | Link |
|---|---|---|
| **This repo** | Factory contracts, Port model, coordinator, Claude executor, 5 factory stages, evaluation | [ai-software-factory-contract](https://github.com/Darshitpandya/ai-software-factory-contract) |
| Trusted Verifier | Independently owned GitHub App, oasdiff-based API compatibility checks, protected policies | [ai-factory-trusted-verifier](https://github.com/Darshitpandya/ai-factory-trusted-verifier) |
| Billing API | TypeScript reference consumer — tenant-scoped invoice export, OpenAPI compatibility demo | [factory-reference-billing-api](https://github.com/Darshitpandya/factory-reference-billing-api) |
| Notification API | Python reference consumer — event compatibility, PII redaction, factory reuse proof | [factory-reference-notification-api](https://github.com/Darshitpandya/factory-reference-notification-api) |

## Five Factory Stages

```
WorkOrder → Product & Requirements → Software Architecture → Software Engineering
         → Security & Compliance → Platform & Operations → FactoryRun (COMPLETED)
```

## Stack

- **Port** — control plane, context lake, blueprints, actions, scorecards
- **GitHub Actions** — workflow orchestration, `factory-run.yml`, `factory-eval.yml`, `factory-promote.yml`
- **Claude Agent SDK** (`@anthropic-ai/sdk`) — AI execution loop per stage
- **AGENTS.md** — repository working instructions loaded into Claude context
- **SKILL.md** (15 skills) — versioned, locked procedures for each factory capability
- **MCP** — Port context read, GitHub read, GitHub PR (engineering stage only)
- **OpenSandbox** — isolated execution (Docker local / OpenSandbox service in CI)
- **oasdiff** — OpenAPI breaking-change detection in the trusted verifier
- **PostgreSQL** — durable `FactoryRun` state, leases, outbox, evaluation comparisons

## Quickstart

```bash
cp .env.example .env              # fill in real credentials
docker compose -f infra/local/docker-compose.yaml up -d
pnpm install
pnpm bootstrap                    # DB migrations + skills.lock + Port entities
pnpm factory doctor --profile local-dev
pnpm factory port:apply           # apply Port blueprints and service entities
# Then create a WorkOrder in Port → factory-run.yml workflow dispatches
```

## CI

| Workflow | Trigger | What it checks |
|---|---|---|
| `verify-repo.yml` | push/PR to main | typecheck, lint, test, skills registry |
| `factory-run.yml` | workflow_dispatch (Port action) | full 5-stage factory run |
| `factory-eval.yml` | workflow_dispatch | v1.4.0 vs v1.5.0 evaluation |
| `factory-promote.yml` | workflow_dispatch | promote after evaluation decision |

## Factory Releases

- `factory-releases/1.4.0/factory-release.yaml` — **ACTIVE**
- `factory-releases/1.5.0/factory-release.yaml` — CANDIDATE (run `factory evaluation:run` to compare)
- `factory-releases/active.yaml` — protected pointer, only updated via `factory promote`
