# apps

The coordinator worker and the CLI.

→ [Root README](../README.md#quick-start)

---

<img src="../docs/diagrams/s18-execution-lifecycle-light.gif#gh-light-mode-only" alt="Execution lifecycle" width="840">
<img src="../docs/diagrams/s18-execution-lifecycle-dark.gif#gh-dark-mode-only" alt="Execution lifecycle" width="840">

> **Note:** This diagram shows GitHub Actions as the trigger and the coordinator as the execution engine. In this reference implementation the coordinator runs on a workstation (`nohup tsx apps/factory-coordinator/src/index.ts &`). GitHub Actions creates the work order record; the coordinator processes it. In production the coordinator is a deployed persistent service.

---

## factory-coordinator

Stateful worker. Polls PostgreSQL every 10 seconds and processes PENDING runs.

**On each poll:**
1. Syncs PENDING Port entities that have no DB record (created by GitHub Actions self-service action)
2. Finds the oldest PENDING or RUNNING run
3. Acquires a lease (prevents duplicate processing)
4. Fetches work order context from Port
5. Creates an isolated workspace, seeds it with `work-order.json`
6. Runs Claude via the executor for the current stage
7. Copies workspace to `evidence/runs/{id}/{stage}/workspace/`
8. Updates Port entity with current stage, model, tokens, cost
9. Advances to next stage or marks run COMPLETED

**Start:**
```bash
export $(cat .env | grep -v '#' | xargs)
nohup node_modules/.bin/tsx apps/factory-coordinator/src/index.ts > /tmp/coordinator.log 2>&1 &
tail -f /tmp/coordinator.log
```

**Stop:**
```bash
pkill -f "tsx apps/factory-coordinator"
```

## factory-cli

```bash
pnpm factory doctor --profile local-dev
pnpm factory run --work-order <id> --release 1.4.0
pnpm factory resume --run-id <uuid>
pnpm factory port:apply
pnpm factory registry:verify
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory promote --candidate 1.5.0 --decision <id>
pnpm factory evidence:verify --run-id <uuid>
```

The CLI creates the DB record and Port entity, then exits. The coordinator picks it up on the next poll.
