import { Pool } from "pg";
import crypto from "crypto";
import { createPortClientFromEnv } from "@factory/port-client";
import { createRun } from "@factory/state-machine";
import type { WorkOrder } from "@factory/contract-types";

interface RunOpts {
  workOrder: string;
  release: string;
  dryRun?: boolean;
}

export async function runCommand(opts: RunOpts): Promise<void> {
  const { workOrder: workOrderId, release, dryRun } = opts;

  console.log(`\n🏭 factory run`);
  console.log(`  work-order: ${workOrderId}`);
  console.log(`  release:    ${release}`);
  if (dryRun) console.log(`  mode:       DRY RUN\n`);

  // ── Resolve WorkOrder from Port ───────────────────────────────────────────
  console.log("Resolving WorkOrder from Port...");
  const port = createPortClientFromEnv();
  let workOrderEntity;
  try {
    workOrderEntity = await port.getEntity("workOrder", workOrderId);
  } catch (e) {
    console.error(`✗ WorkOrder ${workOrderId} not found in Port: ${e}`);
    process.exit(1);
  }

  const workOrder: WorkOrder = {
    id: workOrderEntity.identifier,
    version: 1,
    title: workOrderEntity.title ?? workOrderId,
    targetService: workOrderEntity.properties["targetService"] as string ?? "",
    scope: workOrderEntity.properties["scope"] as string ?? "",
    factoryRelease: release,
    requestedBy: workOrderEntity.properties["requestedBy"] as string ?? "cli",
    createdAt: new Date().toISOString(),
    constraints: workOrderEntity.properties["constraints"] as Record<string, unknown> ?? {},
    portRunId: workOrderEntity.properties["portRunId"] as string ?? undefined,
    status: "PENDING",
  };

  console.log(`  ✓ WorkOrder resolved: "${workOrder.title}"`);
  console.log(`  target service: ${workOrder.targetService}`);

  if (dryRun) {
    console.log("\n✓ Dry run complete — no run created");
    return;
  }

  // ── Create run record ─────────────────────────────────────────────────────
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const runId = crypto.randomUUID();

  const run = await createRun(pool, {
    id: runId,
    workOrderId,
    factoryRelease: release,
    status: "PENDING",
    currentStage: "product-requirements",
    createdAt: new Date().toISOString(),
  });

  console.log(`\n✓ Factory run created`);
  console.log(`  run-id: ${runId}`);
  console.log(`  status: ${run.status}`);

  // ── Update Port WorkOrder status ──────────────────────────────────────────
  await port.updateWorkOrderStatus(workOrderId, "RUNNING");
  await port.upsertFactoryRun(run, workOrder.portRunId);

  console.log(`\nRun dispatched. Monitor at:`);
  console.log(`  Port:    https://app.getport.io/factoryRun/${runId}`);
  console.log(`\nResume if interrupted:`);
  console.log(`  pnpm factory resume --run-id ${runId}`);
  console.log(`\nNote: The coordinator picks this up automatically.`);
  console.log(`To start coordinator locally: pnpm --filter factory-coordinator start`);

  await pool.end();
  process.exit(0);
}
