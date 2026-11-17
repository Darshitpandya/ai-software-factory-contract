# scripts

Utility scripts for setup, maintenance, and Port data management.

→ [Root README](../README.md#commands-reference) for the full CLI reference.

---

## Scripts

| Script | When to run | What it does |
|--------|------------|-------------|
| `bootstrap.ts` | First-time setup | Runs DB migrations → recomputes skills.lock.json → applies Port entities → verifies registry. Run once after cloning. |
| `lock-components.ts` | After editing any SKILL.md or AGENTS.md | Recomputes SHA-256 digests in `factory-releases/skills.lock.json` and `factory-releases/sandbox.lock.json`. |
| `migrate.ts` | DB schema changes | Applies SQL migrations in `db/migrations/` to PostgreSQL. |
| `backfill-port-runs.py` | After factory runs complete | Reads `evidence/runs/` artifact files, computes per-stage token counts and costs at coordinator pricing, updates Port `factoryRun` entities. |

## First-time setup sequence

```bash
# 1. Copy and fill credentials
cp .env.example .env

# 2. Start local PostgreSQL
docker compose -f infra/local/docker-compose.yaml up -d

# 3. Bootstrap (migrations + skills lock + Port entities + registry verify)
pnpm bootstrap

# 4. Check everything
pnpm factory doctor --profile local-dev
```

## After each factory run

```bash
# Update Port entity cost and model data from evidence artifacts
export PORT_CLIENT_ID=... PORT_CLIENT_SECRET=...
python3 scripts/backfill-port-runs.py
```

## Pricing used by backfill-port-runs.py

Matches `MODEL_PRICING` in `packages/claude-executor/src/index.ts`:

| Model | Input | Output |
|-------|-------|--------|
| `claude-opus-5-5` | $15/MTok | $75/MTok |
| `claude-sonnet-5-5` | $3/MTok | $15/MTok |
| `claude-haiku-5-5` | $0.25/MTok | $1.25/MTok |
| `claude-fable-5-2` | $1/MTok | $5/MTok |
