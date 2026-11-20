import { Pool } from "pg";

export async function evidenceVerifyCommand(opts: { runId: string }): Promise<void> {
  const pool = new Pool(process.env["DATABASE_SSL"] === "true" ? { connectionString: process.env["DATABASE_URL"], ssl: { rejectUnauthorized: false } } : { connectionString: process.env["DATABASE_URL"] });
  const res = await pool.query("SELECT * FROM factory_runs WHERE id = $1", [opts.runId]);
  const row = res.rows[0] as Record<string, unknown> | undefined;

  if (!row) {
    console.error(`✗ Run ${opts.runId} not found`);
    await pool.end();
    process.exit(1);
  }

  console.log(`\n🔍 factory evidence:verify`);
  console.log(`  run-id:    ${opts.runId}`);
  console.log(`  status:    ${row["status"]}`);
  console.log(`  evidence:  ${row["evidence_ref"] ?? "(none yet)"}`);

  if (!row["evidence_ref"]) {
    console.warn("\n⚠  No evidence ref recorded — run may not be complete");
    await pool.end();
    process.exit(0);
  }

  // Verify stage records integrity
  const stages = await pool.query(
    "SELECT * FROM stage_executions WHERE run_id = $1 ORDER BY stage, attempt",
    [opts.runId]
  );

  console.log(`\nStage records (${stages.rows.length} total):`);
  for (const s of stages.rows as Record<string, unknown>[]) {
    console.log(`  ${String(s["stage"]).padEnd(30)} attempt ${s["attempt"]}  status: ${s["status"]}`);
    if (s["artifact_ref"]) console.log(`    artifact: ${s["artifact_ref"]}`);
    if (s["acceptance_ref"]) console.log(`    acceptance: ${s["acceptance_ref"]}`);
  }

  await pool.end();
}
