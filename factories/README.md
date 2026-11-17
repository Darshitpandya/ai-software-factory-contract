# factories

One directory per production stage. Each contains working instructions, skill procedures, an acceptance policy, and a verification script.

→ [Root README](../README.md#architecture) · [docs/models.md](../docs/models.md)

---

<img src="../docs/diagrams/s23-five-questions-light.png#gh-light-mode-only" alt="One work order, five questions for every factory" width="840">
<img src="../docs/diagrams/s23-five-questions-dark.png#gh-dark-mode-only" alt="One work order, five questions for every factory" width="840">

---

## Structure

```
factories/
  product-requirements/
    AGENTS.md                         ← working instructions for this stage
    acceptance.yaml                   ← what ACCEPTED means for this stage
    workflow.yaml                     ← stage execution configuration
    skills/
      requirements-analysis/SKILL.md
      acceptance-criteria/SKILL.md
      work-decomposition/SKILL.md
    scripts/
      verify-requirements.ts
  software-architecture/   (architecture-options, adr-authoring, openapi-contract)
  software-engineering/    (feature-implementation, test-driven-change, safe-refactor)
  security-compliance/     (security-review, vulnerability-remediation, compliance-evidence)
  platform-operations/     (release-assessment, incident-triage, remediation-plan)
  AGENTS.md                ← root-level instructions shared across all stages
  acceptance.yaml          ← root acceptance policy
```

## Stage outputs (from real run evidence)

| Stage | Model | Output files |
|-------|-------|-------------|
| product-requirements | claude-sonnet-5-5 | `product-spec.md` · `acceptance.yaml` · `work-items.json` |
| software-architecture | claude-opus-5-5 | `architecture.md` · `openapi-delta.yaml` · `adr.md` |
| software-engineering | claude-opus-5-5 | `implementation-notes.md` · `pr-description.md` |
| security-compliance | claude-sonnet-5-5 | `security-review.md` · `compliance-checklist.md` |
| platform-operations | claude-haiku-5-5 | `deployment.json` · `health-evidence.json` · `runbook.md` |

## What AGENTS.md contains

Working instructions for the Claude executor — build commands, path boundaries, what not to modify, factual domain conventions. Loaded before every stage execution. Does not name a model or grant permissions (those live in `factory-releases/`).

## What SKILL.md contains

A single reusable procedure: name, version, steps, expected inputs and outputs. SHA-256 digests are locked in `factory-releases/skills.lock.json`. A change to any SKILL.md requires re-running `pnpm lock-components`.

## Adapting for your domain

Replace the content of `AGENTS.md` and each `SKILL.md` with your domain's conventions. File locations and format stay the same. The coordinator loads whatever is in these files at runtime — no code change needed.

Do not add credentials, model names, or permission grants to `AGENTS.md` or `SKILL.md`. Those belong in `factory-releases/`.
