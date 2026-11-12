import { Pool } from "pg";
import { getRun } from "@factory/state-machine";
import { FACTORY_STAGES } from "@factory/contract-types";

export async function resumeCommand(opts: { runId: string; fromStage?: string }): Promise<void> {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const run = await getRun(pool, opts.runId);

  if (!run) {
    console.error(`✗ Run ${opts.runId} not found`);
    await pool.end();
    process.exit(1);
  }

  console.log(`\n🔄 factory resume`);
  console.log(`  run-id:  ${run.id}`);
  console.log(`  status:  ${run.status}`);
  console.log(`  release: ${run.factoryRelease}`);
  console.log(`\nStage status:`);
  for (const stage of FACTORY_STAGES) {
    const s = run.stages[stage];
    console.log(`  ${stage.padEnd(30)} ${s?.status ?? "PENDING"}  (attempts: ${s?.attempts ?? 0})`);
  }

  if (run.status === "COMPLETED") {
    console.log("\n✓ Run already COMPLETED — nothing to resume");
    await pool.end();
    process.exit(0);
  }

  console.log(`\nCoordinator will resume from: ${run.currentStage ?? FACTORY_STAGES[0]}`);
  console.log(`To monitor: pnpm factory doctor then check Port entity factoryRun/${run.id}`);
  await pool.end();
}
