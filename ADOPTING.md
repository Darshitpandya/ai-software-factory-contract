# Adopting the AI Software Factory Contract

This guide takes you from an existing codebase to a running factory pipeline. It uses the billing API (`factory-reference-billing-api`) as the worked example throughout — the same repository used in the reference runs in `evidence/`.

You are adopting a governance pattern, not a framework. You do not copy orchestration code into your repo. The factory runs against your repository from the outside.

---

## What you need before you start

### Accounts and services

| What | Why | Optional? |
|------|-----|-----------|
| [Port](https://app.getport.io) org | Control plane — blueprints, work orders, run visibility | No |
| [Anthropic API key](https://console.anthropic.com) | Claude executes every stage | No |
| PostgreSQL database | Coordinator state, leases, retries | No |
| GitHub organisation or personal account | Your consumer repo lives here | No |
| Docker Desktop | Local sandbox isolation | No (dev mode) |
| GitHub App (Producer) | Opens PRs on your repo | For engineering stage PR creation |
| [`ai-factory-trusted-verifier`](https://github.com/Darshitpandya/ai-factory-trusted-verifier) | Runs the independent acceptance check | For the full acceptance boundary |

**Minimum to run your first factory run locally:** Port org + Anthropic API key + PostgreSQL + Docker.

The GitHub App and trusted verifier are required for the closed-loop path (engineering stage → real PR → acceptance check → next stage). Without them, the engineering stage produces code artifacts locally but no PR is opened and no acceptance check fires.

### Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
# Required — no factory run without these
PORT_CLIENT_ID=...           # Port → Settings → Credentials
PORT_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...        # Anthropic Console → API Keys
DATABASE_URL=postgresql://factory:factory@localhost:5432/factory

# Required for PR creation in the engineering stage
FACTORY_APP_ID=...
FACTORY_APP_PRIVATE_KEY_PATH=/path/to/private-key.pem
FACTORY_APP_INSTALLATION_ID=...
GITHUB_BILLING_REPO=your-org/your-repo   # owner/repo of the service you are running against

# Optional — MCP server for real Port catalog lookups during execution
PORT_MCP_BINARY=packages/port-mcp-server/src/index.ts
```

Leave `OPENSANDBOX_URL` unset. The sandbox adapter falls back to real local Docker containers automatically. Set it only if you have a live OpenSandbox API endpoint.

---

## Step 1 — Onboard your repository

Three files go into your consumer repository. None of them are code. They define who owns the repo, what build commands run, and what acceptance conditions must hold.

### 1a. `.factory/repository-contract.yaml`

This is the most important file. It is the versioned acceptance policy for your repository. The factory reads it; the verifier enforces it.

```yaml
# .factory/repository-contract.yaml
apiVersion: factory.contract/v1
kind: RepositoryContract

metadata:
  name: your-service-name          # must match the Port service identifier
  owner: your-team-name
  language: TypeScript             # or Python, Go, Java, Rust
  description: What this service does

consumedRelease: "1.4.0"           # which factory release this repo accepts

build:
  install: "pnpm install --frozen-lockfile"
  typecheck: "pnpm typecheck"
  test: "pnpm test"
  # Add whatever build/test/validate commands your repo uses

acceptance:
  requiredChecks:
    - factory-contract/acceptance   # the independent verifier check — do not change this name
  compatibilityBaselinePath: openapi/openapi.yaml   # path to your API baseline (if applicable)
  tenantIsolationRequired: false   # set true if your service is multi-tenant

doNotModify:
  - .factory/repository-contract.yaml   # the factory must not weaken its own contract
  - .github/workflows/ci.yml
```

**Billing API reference:** [`factory-reference-billing-api/.factory/repository-contract.yaml`](https://github.com/Darshitpandya/factory-reference-billing-api/blob/main/.factory/repository-contract.yaml)

The `doNotModify` list is enforced by the AGENTS.md loaded into every stage — Claude is instructed not to touch these files in the same PR as code changes.

### 1b. `AGENTS.md` in your repo root

This file is loaded into the executor before every stage that touches your repository. It contains factual workspace instructions — not aspirational guidance. Write what is actually true about your repo.

```markdown
# Your Service — Engineering Instructions

Owner: your-team-name. Language: TypeScript. Build: pnpm. Runtime: Fastify.

## Commands
- `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`

## Boundaries
- Preserve existing public API endpoint behavior and OpenAPI schema.
- Tenant identity from validated JWT claims only — never from query parameters.
- Do not edit .factory/repository-contract.yaml in the same PR as code changes.
- Do not modify .github/workflows/ci.yml.
```

Write the commands that actually work in your repo. Write the boundaries that are actually enforced by your CI. If a constraint is not checked by an independent system, do not list it — it will not be enforced.

**Billing API reference:** [`factory-reference-billing-api/AGENTS.md`](https://github.com/Darshitpandya/factory-reference-billing-api/blob/main/AGENTS.md)

### 1c. `.factory/work-orders/your-feature.yaml`

A work order describes one unit of engineering intent. It is the input the factory processes.

```yaml
# .factory/work-orders/add-export-endpoint.yaml
apiVersion: factory.contract/v1
kind: WorkOrder

metadata:
  id: wo-your-service-add-export-001
  targetService: your-service-name    # must match the Port service identifier
  factoryRelease: "1.4.0"
  requestedBy: your-team-name

scope: |
  Add a CSV export endpoint (GET /v1/items/export) to the existing service.
  Requirements:
  1. Scope data to the authenticated user only.
  2. Preserve the existing GET /v1/items endpoint without breaking changes.
  3. Enforce a maximum of 10,000 rows per export.
  4. Return 403 for unauthorized access.

constraints:
  backwardCompatibility: true
  existingEndpointsMustNotBreak: true

acceptanceCriteria:
  - "New endpoint exists and returns CSV"
  - "Existing endpoint behavior unchanged"
  - "factory-contract/acceptance check passes on the PR"
```

**Billing API reference:** [`factory-reference-billing-api/.factory/work-orders/invoice-export.yaml`](https://github.com/Darshitpandya/factory-reference-billing-api/blob/main/.factory/work-orders/invoice-export.yaml)

---

## Step 2 — Set up Port

Port is the control plane. You need blueprints, a service entity, and self-service actions.

### 2a. Apply blueprints via Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in port_client_id, port_client_secret, github_token, github_owner
terraform init
terraform apply
```

This creates 8 blueprints in your Port org:

| Blueprint | What it represents |
|-----------|-------------------|
| `service` | Your deployable service |
| `workOrder` | An engineering intent moving through the factory |
| `repositoryContract` | The versioned acceptance policy for a service's repo |
| `factoryRelease` | A pinned, locked factory configuration |
| `factoryRun` | A complete pipeline execution and its evidence |
| `promotionDecision` | A recorded promote / hold / reject decision |
| `factoryComponent` | An internal factory package, skill, or adapter |
| `factorySkill` | An individual skill with its SHA-256 digest |

If you already have some of these blueprints from a previous setup, Terraform will manage them without recreating — it uses `ON CONFLICT DO NOTHING` semantics via the Port provider.

### 2b. Create your service entity in Port

After `terraform apply`, create a `service` entity in Port manually or via the CLI:

- Identifier: matches `metadata.name` in your `repository-contract.yaml`
- Title: human-readable name
- Language: your stack
- Repository URL: your GitHub repo URL

You can also create this via Port's UI: **Builder → service → + New service**.

### 2c. Create the factory release entities

```bash
pnpm bootstrap
```

This runs the database migration, registers the skills lock, and creates `factoryRelease` entities in Port for the active release (1.4.0) and the candidate (1.5.0).

If `bootstrap` fails on Port entity creation (e.g. entity already exists), that is safe to ignore — the entities are idempotent.

### 2d. Apply Port pages (optional, for the UI experience)

```bash
export PORT_CLIENT_ID=... PORT_CLIENT_SECRET=...
python3 control-plane/port/apply-pages.py
```

This sets up the factory dashboard pages in Port. Skip this if you only need the CLI and coordinator to work.

---

## Step 3 — Set up GitHub Apps

Two GitHub Apps are required for the full acceptance boundary.

### Producer App (this factory opens PRs)

1. Create a GitHub App in your org: **Settings → Developer settings → GitHub Apps → New GitHub App**
2. Permissions required: `Contents: Read & Write`, `Pull requests: Write`, `Actions: Write`
3. Generate a private key → save to a path on disk → set `FACTORY_APP_PRIVATE_KEY_PATH` in `.env`
4. Install the App on your consumer repository
5. Copy the App ID → `FACTORY_APP_ID`, Installation ID → `FACTORY_APP_INSTALLATION_ID`

### Verifier App (independent acceptance check)

The [ai-factory-trusted-verifier](https://github.com/Darshitpandya/ai-factory-trusted-verifier) runs the `factory-contract/acceptance` check using `oasdiff`. It is independently owned — the producer cannot satisfy its check.

1. Fork or deploy the verifier repo following its `README.md`
2. Its GitHub App needs: `Contents: Read`, `Checks: Write`, `Pull requests: Read`
3. Install the Verifier App on your consumer repository
4. Set branch protection on your consumer repo:
   - Add `factory-contract/acceptance` as a required status check
   - Under **Require status checks** → set the source to the Verifier App identity, not the Producer App

**Why this separation matters:** if the same App that opens the PR can also mark its own check as passing, the acceptance boundary does not exist. The required check must come from the verifier's separate App identity.

---

## Step 4 — Run your first factory run

### 4a. Start the coordinator

```bash
# From the factory contract repo root
pnpm install
node_modules/.bin/tsx apps/factory-coordinator/src/index.ts
```

The coordinator polls PostgreSQL every 10 seconds for PENDING runs. Keep this running in a terminal or background process during development.

Confirm it starts cleanly:

```
🏭 Factory Coordinator starting...
✓ Port connected (org: your-org)
✓ Docker container started: factory-sandbox-... (image: node:22-alpine)
✓ Coordinator ready. Polling every 10s...
```

If Docker is not running, the sandbox falls back to plain temp directories with a warning. The factory still runs — commands just execute locally rather than in an isolated container.

### 4b. Health check

```bash
pnpm factory doctor --profile local-dev
```

This checks Port connectivity, database, Docker, GitHub credentials, and the skills registry.

### 4c. Trigger a run

**From the CLI:**

```bash
pnpm factory run --work-order wo-your-service-add-export-001 --release 1.4.0
```

**From Port (after self-service actions are configured):**

1. Open your `workOrder` entity in Port
2. Click **Trigger Factory Run**
3. The GitHub Action creates the Port entity and DB record
4. The coordinator picks it up within 10 seconds and starts processing

### 4e. Watch the run

The coordinator prints stage-by-stage progress:

```
[run-id] Processing stage: product-requirements
  ✓ WorkOrder context loaded: "Add CSV export endpoint"
  ✓ Docker container started: factory-sandbox-a1b2c3d4
  ✓ Workspace seeded: /tmp/factory-sandbox-...
    Turn 1: tools=[read_file, write_file]
    Turn 2: tools=[write_file, write_file]
    Turn 3: tools=[report_stage_output]
    report_stage_output: outputFiles=["product-spec.md","acceptance.yaml","work-items.json"]
  ✓ Docker container stopped: factory-sandbox-a1b2c3d4
  ✓ Workspace copied to evidence: evidence/runs/<run-id>/product-requirements/
  ✓ Stage product-requirements ACCEPTED (internal check)
```

The engineering stage additionally:

```
  ✓ Engineering workspace seeded with N source files from your-org/your-repo
  ✓ Branch created: factory-run/a1b2c3d4 (from abc1234)
  ✓ Pushed N file(s) to branch factory-run/a1b2c3d4
  ✓ PR created: https://github.com/your-org/your-repo/pull/42
  ⏳ Waiting for factory-contract/acceptance check...
```

### 4f. Read the evidence

After the run, evidence is in `evidence/runs/<run-id>/`:

```
evidence/runs/<run-id>/
  product-requirements/
    <artifact-id>/
      artifact.json          # stage metadata, SHA-256, model used, token usage
      workspace/             # copy of everything Claude produced
        product-spec.md
        acceptance.yaml
        work-items.json
  software-architecture/
    ...
  software-engineering/
    ...
      execution-manifest.json  # PR number, headSha, prOwner, prRepo
  security-compliance/
    ...
  platform-operations/
    ...
```

The `artifact.json` for each stage records:

- `modelUsed` — which Claude model ran this stage
- `factoryRelease` — which release version governed this run
- `tokenUsage` — input and output tokens consumed
- `sha256` — digest of the artifact bundle
- `producedFiles` — what Claude wrote

No stage marks itself as `ACCEPTED`. That status is set by the coordinator after the verifier check passes or by the internal acceptance logic for non-engineering stages.

---

## Step 5 — What to customise for your context

### Your AGENTS.md controls what Claude knows about your repo

The factory loads your `AGENTS.md` for the engineering stage and feeds it to Claude as working instructions. Write accurate build commands, accurate path boundaries, and accurate do-not-modify rules. Anything aspirational that is not enforced by CI will be ignored or violated.

What to include:
- Exact install, build, typecheck, test commands
- Which files must not be modified in the same PR as code
- Naming conventions and path conventions Claude should follow
- Any domain rules that map to mechanical checks (e.g. "never log raw PII" if your CI runs a PII check)

### Skills are loaded per stage — you can extend them

Each factory stage loads 3 SKILL.md files from `factories/<stage>/skills/`. Skills are procedures that teach Claude one reusable workflow. They are locked in `skills.lock.json` with SHA-256 digests.

To add a skill for a stage:
1. Create `factories/<stage>/skills/<skill-name>/SKILL.md`
2. Run `pnpm lock-components` to update the digests
3. Run `pnpm factory registry:verify` to confirm the new skill is registered
4. Bump the factory release version (`factory-releases/1.5.0/factory-release.yaml` or a new version) and reference the new skills lock

Do not modify skills and claim the same release version — the lock will catch the mismatch.

### Changing the model for a stage

Edit `factory-releases/<version>/factory-release.yaml`:

```yaml
stageModels:
  software-engineering: claude-sonnet-5-5   # was claude-opus-5-5
```

This is a factory-release change. It requires a new version, an evaluation run against the fixed suite, and a promotion decision before it becomes active.

Do not change the model by editing a prompt. Model selection belongs in the release manifest, not in the instructions.

### Adding your repository to the evaluation suite

Add a work order to `evaluation/work-orders/` and reference it in `evaluation/suite.yaml`:

```yaml
workOrders:
  - id: eval-003
    path: evaluation/work-orders/your-service-task.yaml
    weight: 0.5
    description: Your service workload
    stages: [product-requirements, software-architecture, software-engineering]
```

Then run:

```bash
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory evaluation:report --comparison <comparison-id>
```

---

## What you do not need to do

- **Copy any orchestration code.** The coordinator, executor, state machine, and all packages stay in this repo. Your consumer repo only has `.factory/`, `AGENTS.md`, and your normal application code.
- **Write a custom acceptance check.** The `factory-contract/acceptance` check is provided by the trusted verifier. You configure branch protection to require it; you do not implement it.
- **Change the factory release to onboard.** Use `1.4.0` as written. Create a new release version only when you are evaluating a material change to the factory configuration (model, skills, tools, sandbox).
- **Touch `factory-releases/active.yaml` manually.** This file is updated only by `pnpm factory promote` after a valid PromotionDecision. Editing it directly bypasses the promotion gate.

---

## What to expect from the first run

The first run will likely produce good artifacts for stages 1–2 (requirements, architecture) and reasonable artifacts for stages 3–5. The engineering stage will produce real TypeScript (or Python, depending on your service) based on what Claude reads from your workspace.

Whether the PR passes the acceptance check depends on:
- Whether your `openapi/openapi.yaml` baseline is accurate
- Whether the code Claude produced actually compiles and passes your CI
- Whether the verifier's `oasdiff` check finds breaking changes

Expect to iterate. The first run is evidence of whether the contract and instructions are accurate, not proof that the factory is production-ready for your service. Read the evidence in `artifact.json`, adjust your `AGENTS.md` and `repository-contract.yaml`, and run again.

---

## Troubleshooting

**Coordinator exits immediately:** Check `DATABASE_URL` — PostgreSQL must be running. Run `pnpm factory doctor` for a full health check.

**Stage produces no output files:** Claude did not call `report_stage_output`. Check the coordinator log for `Turn N:` entries — if Claude ran out of turns or produced only text, the AGENTS.md or work order scope may be too vague.

**Engineering stage produces code but no PR:** `GITHUB_BILLING_REPO` (or whichever env var maps to your repo) is not set, or the GitHub App credentials are not configured. The stage still runs and produces code locally in `evidence/runs/`.

**`factory-contract/acceptance` check never appears:** The Verifier App is not installed on your consumer repo, or the GitHub App webhook is not reaching the verifier. Check the verifier's deployment logs.

**Port entity not found in coordinator:** The work order entity identifier in Port must exactly match the `--work-order` argument. Check the entity identifier in Port (not the title).

---

## Reference files

| File | Purpose |
|------|---------|
| `contracts/schemas/repository-contract.schema.json` | JSON Schema for `repository-contract.yaml` — validate yours against this |
| `factory-releases/1.4.0/factory-release.yaml` | Active release — model assignments, sandbox config |
| `evaluation/suite.yaml` | Fixed evaluation workloads and hard gates |
| `factories/*/AGENTS.md` | Per-stage factory instructions — model for your domain-specific instructions |
| `factories/*/skills/*/SKILL.md` | 15 locked skills — read these to understand what each stage can do |
| `evidence/runs/` | Real run artifacts — read `artifact.json` and produced files to understand what output looks like |
| `.env.example` | All environment variables with descriptions |
| `infra/terraform/blueprints.tf` | Port blueprint definitions |

The billing API reference implementation is the most complete example:
- Consumer repo: [`factory-reference-billing-api`](https://github.com/Darshitpandya/factory-reference-billing-api)
- Repository contract: `.factory/repository-contract.yaml`
- Work order: `.factory/work-orders/invoice-export.yaml`
- AGENTS.md: root of the repo
- Evidence: `evidence/runs/` in this repo (the billing API was the target service for all reference runs)
