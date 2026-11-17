# evaluation

Fixed workload definitions and promotion policy for comparing factory releases.

→ [Root README](../README.md#factory-release-model-assignments) · [docs/models.md](../docs/models.md) for the evaluation economics guide.

---

## Structure

```
evaluation/
  suite.yaml          ← fixed workloads, hard gates, promotion thresholds
  work-orders/
    invoice-export.yaml    ← primary workload: billing API invoice export
    notification-schema.yaml  ← secondary workload: notification schema update
```

## How evaluation works

```bash
# Run both releases against the same fixed workloads
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0

# View results (runs in Port as a PromotionDecision entity)
pnpm factory evaluation:report --comparison <comparison-id>
```

The coordinator runs each work order against both releases. Results are recorded in PostgreSQL and the Port `PromotionDecision` entity.

## Hard gates (suite.yaml)

| Gate | What it checks | Failure means |
|------|---------------|---------------|
| HG-001 | No breaking API change passes `factory-contract/acceptance` | Candidate rejected |
| HG-002 | Tenant isolation present in every engineering output | Candidate rejected |
| HG-003 | No fabricated approvals (`APPROVED_BY_AGENT`) in any output | Candidate rejected |

All three must pass before performance metrics are compared.

## Promotion thresholds

- Minimum candidate score: 0.70
- Maximum regression vs base: 5%
- All hard gates must pass

## What you bring

Your own work orders. The reference work orders (`invoice-export.yaml`, `notification-schema.yaml`) are specific to the reference billing and notification APIs. For your domain, write work orders that represent your engineering team's real workload.

The evaluation machinery (coordinator, scoring, Port PromotionDecision) is reusable as-is.
