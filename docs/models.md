# Model Selection in the AI Software Factory Contract

**How models are assigned, where they live in the codebase, and how to change them.**

---

## The single source of truth: FactoryRelease YAML

Every model assignment lives in `factory-releases/<version>/factory-release.yaml`.
The `FactoryRelease` manifest is the **only authoritative source** for model selection.
Nothing else controls which model runs in a given stage.

```yaml
# factory-releases/1.4.0/factory-release.yaml
runtime:
  defaultModel: claude-opus-5-5    # ← used if stageModels has no entry for a stage

stageModels:
  product-requirements: claude-sonnet-5-5   # ← per-stage override wins over defaultModel
  software-architecture: claude-opus-5-5
  software-engineering: claude-opus-5-5
  security-compliance: claude-sonnet-5-5
  platform-operations: claude-haiku-5-5
```

---

## Where the model is resolved at runtime

One line in `packages/claude-executor/src/index.ts`:

```typescript
// packages/claude-executor/src/index.ts  (executeStage method)
const model =
  factoryRelease.stageModels?.[stage] ?? factoryRelease.runtime.defaultModel;
```

Resolution order:
1. `stageModels[currentStage]` — if defined for this stage, use it
2. `runtime.defaultModel` — fallback for any stage not listed in `stageModels`

The `model` string is passed directly to `@anthropic-ai/sdk` as the model parameter:
```typescript
const response = await this.client.messages.create({
  model,   // ← this exact string from FactoryRelease
  max_tokens: 8192,
  ...
});
```

---

## Current model assignments

### Release 1.4.0 — ACTIVE (baseline)

| Stage | Model | Rationale |
|---|---|---|
| `product-requirements` | `claude-sonnet-5-5` | Requirements: creative + structured; Sonnet's speed/intelligence balance |
| `software-architecture` | `claude-opus-5-5` | ADRs + OpenAPI: deep reasoning over compatibility constraints |
| `software-engineering` | `claude-opus-5-5` | Code + tests: long-horizon, full context window needed |
| `security-compliance` | `claude-sonnet-5-5` | Policy matching + structured evidence; Sonnet is sufficient |
| `platform-operations` | `claude-haiku-5-5` | Health checks, deployment plans; fast structured output |

### Release 1.5.0 — CANDIDATE (Option B — override specific stages only)

```yaml
# factory-releases/1.5.0/factory-release.yaml
runtime:
  defaultModel: claude-opus-5-5  # product-requirements, security-compliance, platform-operations use this

stageModels:
  software-architecture: claude-fable-5-2  # only stages that DIFFER from defaultModel listed here
  software-engineering: claude-fable-5-2
```

| Stage | Model | Source |
|---|---|---|
| `product-requirements` | `claude-opus-5-5` | ← falls back to `defaultModel` |
| `software-architecture` | `claude-fable-5-2` | ← explicit `stageModels` override |
| `software-engineering` | `claude-fable-5-2` | ← explicit `stageModels` override |
| `security-compliance` | `claude-opus-5-5` | ← falls back to `defaultModel` |
| `platform-operations` | `claude-opus-5-5` | ← falls back to `defaultModel` |

**Evaluation hypothesis:** Does `claude-fable-5-2` on the two most demanding stages produce measurably better ADRs and code (fewer engineering stage rejections) at acceptable cost vs the extra ~$0.60 per run?

---

## Latest available models (November 2026)

Source: [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview)

| Model | API ID | Description | Input | Output |
|---|---|---|---|---|
| **Claude Fable 5.2** | `claude-fable-5-2` | Demanding reasoning, long-horizon agentic work | $1/MTok | $5/MTok |
| **Claude Opus 5.5** | `claude-opus-5-5` | Long-running agentic coding and knowledge work | $15/MTok | $75/MTok |
| **Claude Sonnet 5.5** | `claude-sonnet-5-5` | Best combination of speed and intelligence | $3/MTok | $15/MTok |
| **Claude Haiku 5.5** | `claude-haiku-5-5` | High-volume, latency-sensitive, classification/extraction | $0.25/MTok | $1.25/MTok |

All four have a 1M token context window, 128K max output, and knowledge cutoff of June 2026.

---

## How to change a model

### Option A — Change for all stages in a release (cheapest path)

```yaml
# factory-releases/1.5.0/factory-release.yaml
runtime:
  defaultModel: claude-fable-5-2   # ← change this
```

### Option B — Change for specific stages only

```yaml
stageModels:
  software-architecture: claude-fable-5-2   # ← only this stage uses Fable
  software-engineering: claude-fable-5-2    # ← only this stage uses Fable
  # other stages fall back to defaultModel
```

### Option C — Create a new candidate release

```bash
# 1. Copy the current active release
cp -r factory-releases/1.4.0 factory-releases/1.6.0

# 2. Edit the YAML: bump version, change status to CANDIDATE, update models
#    Change metadata.version: "1.6.0", metadata.status: CANDIDATE

# 3. Run evaluation
pnpm factory evaluation:run --base 1.4.0 --candidate 1.6.0

# 4. If evaluation passes all hard gates:
pnpm factory promote --candidate 1.6.0 --decision <evaluation-decision-id>
```

A model change without a new FactoryRelease version and an evaluation run will **not** be accepted by `pnpm factory promote`. The promotion gate requires a `PromotionDecision` with `allHardGatesPassed: true`.

---

## What does NOT control the model

These do NOT determine which Claude model runs:
- `AGENTS.md` — workspace instructions loaded into the model's context, not the model selector
- `SKILL.md` — procedures the model follows, not the model selector
- MCP tool configuration — tool access scope, not the model selector
- `ANTHROPIC_API_KEY` env var — credentials only
- GitHub Actions workflow environment variables — these provide the API key but not the model choice
- Port actions or Port entity properties — these are metadata for display, not runtime execution

**Only the `FactoryRelease` YAML controls model selection.**

---

## Model economics: 1.4.0 vs 1.5.0 cost comparison

For the reference WorkOrder (invoice export, ~5 stages, ~20 turns per stage):

| Stage | 1.4.0 model | 1.4.0 est. cost | 1.5.0 model | 1.5.0 est. cost |
|---|---|---|---|---|
| product-requirements | Sonnet 5.5 | ~$0.04 | Sonnet 5.5 | ~$0.04 |
| software-architecture | Opus 5.5 | ~$0.20 | Fable 5.2 | ~$0.40 |
| software-engineering | Opus 5.5 | ~$0.40 | Fable 5.2 | ~$0.80 |
| security-compliance | Sonnet 5.5 | ~$0.04 | Sonnet 5.5 | ~$0.04 |
| platform-operations | Haiku 5.5 | ~$0.002 | Haiku 5.5 | ~$0.002 |
| **Total (est.)** | | **~$0.68** | | **~$1.28** |

The evaluation suite measures whether the ~$0.60/run cost premium is justified by measurably fewer rework cycles (second engineering stage attempts) in the Fable-upgraded candidate.

*Estimates assume ~50K input tokens and ~8K output tokens per stage call. Actual usage recorded in `FactoryRun.stages[stage].tokenUsage`.*

---

## TypeScript type reference

```typescript
// packages/contract-types/src/index.ts
interface FactoryReleaseConfig {
  runtime: {
    engine: "claude-agent-sdk";
    defaultModel: string;        // ← Anthropic model ID, e.g. "claude-opus-5-5"
    sandbox: { ... };
  };
  stageModels?: Partial<Record<FactoryStage, string>>;  // ← per-stage overrides
}
```

The model string is validated at runtime by the Anthropic SDK — an invalid model ID causes the stage to fail immediately with a 400 error from the API, which is recorded as a `REJECTED` stage in the `FactoryRun`.
