# apps

The two runnable applications: the coordinator worker and the CLI.

→ [Root README](../README.md#commands-reference) for all CLI commands.

---

## factory-coordinator

The long-running worker that processes factory runs.

**What it does on each poll (every 10 seconds):**
1. Syncs any PENDING Port entities that have no DB record (created by GitHub Actions self-service action)
2. Finds the oldest PENDING or RUNNING run in PostgreSQL
3. Acquires a lease (prevents duplicate processing)
4. Fetches the work order context from Port
5. Creates an isolated workspace, seeds it with `work-order.json`
6. Calls Claude via the executor for the current stage
7. Copies workspace to `evidence/runs/{id}/{stage}/workspace/`
8. Updates Port entity with current stage, model, tokens, cost
9. Advances to the next stage or marks the run COMPLETED

**Start it:**
```bash
export $(cat .env | grep -v '#' | xargs)
nohup node_modules/.bin/tsx apps/factory-coordinator/src/index.ts > /tmp/coordinator.log 2>&1 &
tail -f /tmp/coordinator.log
```

**Stop it:**
```bash
pkill -f "tsx apps/factory-coordinator"
```

## factory-cli

The command-line interface. Run all commands with `pnpm factory <command>`.

```bash
pnpm factory doctor --profile local-dev      # check prerequisites
pnpm factory run --work-order <id> --release 1.4.0
pnpm factory resume --run-id <uuid>
pnpm factory port:apply                       # create Port seed entities
pnpm factory registry:verify                  # check skills.lock.json digests
pnpm factory evaluation:run --base 1.4.0 --candidate 1.5.0
pnpm factory evaluation:report --comparison <id>
pnpm factory promote --candidate 1.5.0 --decision <id>
pnpm factory evidence:verify --run-id <uuid>
```

## Relationship between coordinator and CLI

`pnpm factory run` creates the DB record and Port entity, then exits. The coordinator picks it up on the next poll. They do not need to run simultaneously — start the coordinator first, then trigger runs via the CLI or the Port self-service action.
