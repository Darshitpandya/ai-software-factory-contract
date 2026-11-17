# packages

Internal TypeScript packages that make up the factory runtime. Each is a focused, independently testable unit.

→ [Root README](../README.md#architecture) for how these connect.

---

## Packages

| Package | What it does |
|---------|-------------|
| `claude-executor` | Runs Claude in an agentic loop against a stage — loads AGENTS.md + SKILL.md, executes tool calls (read_file, write_file, run_command, report_stage_output), returns produced files and token usage |
| `sandbox-adapter` | Creates and destroys isolated workspaces — `local-docker` mode uses temp directories; `opensandbox` mode calls the OpenSandbox API |
| `state-machine` | PostgreSQL-backed stage transitions — PENDING → RUNNING → PRODUCED → ACCEPTED/REJECTED → COMPLETED; lease management to prevent duplicate execution |
| `port-client` | Port API client — upserts entities, reads WorkOrders, reports action run status, renews tokens |
| `github-client` | GitHub App client — creates PRs, reads file contents at specific SHAs, lists changed files, all via `kit.request()` (not REST namespace plugins) |
| `artifact-store` | Collects workspace files into evidence bundles, computes SHA-256 bundle hashes, saves and loads artifact manifests |
| `acceptance-client` | Waits for a `factory-contract/acceptance` GitHub check run to complete, returns the conclusion |
| `contract-types` | Shared TypeScript types: `FactoryRun`, `WorkOrder`, `FactoryRelease`, `FactoryStage`, `StageRecord`, etc. |

## Key design decisions

- `claude-executor` forces `report_stage_output` as the final tool call — Claude cannot finish a stage without declaring what it produced
- `state-machine` uses PostgreSQL advisory-style leases to prevent two coordinator workers from processing the same stage simultaneously
- `github-client` uses `kit.request()` throughout — `@octokit/app` installation kits lack the REST namespace plugins
- `port-client` wraps every entity response with `result.entity ?? result` because Port wraps single-entity GET responses in an `entity` key

## What you bring

Nothing — these packages are the shared factory runtime. You do not modify them for your domain. Your domain-specific logic lives in `factories/` (AGENTS.md, SKILL.md) and `.factory/` in your consumer repos.
