# factories

One directory per production stage. Each contains the working instructions (`AGENTS.md`), skill procedures (`skills/*/SKILL.md`), acceptance policy (`acceptance.yaml`), and a verification script.

→ [Root README](../README.md#architecture) for the full pipeline overview.

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
      verify-requirements.ts          ← deterministic check run after Claude
  software-architecture/   (architecture-options, adr-authoring, openapi-contract)
  software-engineering/    (feature-implementation, test-driven-change, safe-refactor)
  security-compliance/     (security-review, vulnerability-remediation, compliance-evidence)
  platform-operations/     (release-assessment, incident-triage, remediation-plan)
  AGENTS.md                           ← root-level instructions shared across all stages
  acceptance.yaml                     ← root acceptance policy
```

## What AGENTS.md contains

Working instructions for the Claude executor — build commands, path boundaries, what not to modify, and factual domain conventions. It is loaded before every stage execution. It does not name a model or grant permissions. Those are in the FactoryRelease.

## What SKILL.md contains

A single reusable procedure: name, version, steps, expected inputs and outputs. Skills are versioned — their SHA-256 digests are locked in `factory-releases/skills.lock.json`. A change to any SKILL.md requires re-running `pnpm lock-components`.

## Adapting for your domain

Replace the content of `AGENTS.md` and each `SKILL.md` with your domain's conventions. The file locations and format stay the same. The coordinator loads whatever is in these files at runtime — no code change needed.

Do not add credentials, model names, or permission grants to any `AGENTS.md` or `SKILL.md`. Those belong in `factory-releases/`.
