import { Pool } from "pg";
import crypto from "crypto";
import { readFileSync, existsSync } from "fs";

export async function evaluationRunCommand(opts: {
  base: string;
  candidate: string;
  suite?: string;
}): Promise<void> {
  const { base, candidate, suite = "evaluation/suite.yaml" } = opts;

  if (!existsSync("factory-releases/" + base + "/factory-release.yaml")) {
    console.error(`✗ Base release ${base} not found`);
    process.exit(1);
  }
  if (!existsSync("factory-releases/" + candidate + "/factory-release.yaml")) {
    console.error(`✗ Candidate release ${candidate} not found`);
    process.exit(1);
  }

  console.log(`\n📊 factory evaluation:run`);
  console.log(`  base:      ${base}`);
  console.log(`  candidate: ${candidate}`);
  console.log(`  suite:     ${suite}`);

  const pool = new Pool(process.env["DATABASE_SSL"] === "true" ? { connectionString: process.env["DATABASE_URL"], ssl: { rejectUnauthorized: false } } : { connectionString: process.env["DATABASE_URL"] });
  const comparisonId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO evaluation_comparisons (id, base_version, candidate_version, status, suite_digest)
     VALUES ($1, $2, $3, 'RUNNING', $4)`,
    [
      comparisonId,
      base,
      candidate,
      existsSync(suite) ? crypto.createHash("sha256").update(readFileSync(suite)).digest("hex") : "not-found",
    ]
  );

  console.log(`\n✓ Evaluation started`);
  console.log(`  comparison-id: ${comparisonId}`);
  console.log(`\nNote: The evaluation coordinator will execute the fixed workload suite.`);
  console.log(`Track progress with: pnpm factory evaluation:report --comparison ${comparisonId}`);
  console.log(`\nIMPORTANT: Results are from actual execution only — no fabricated benchmarks.`);

  await pool.end();
  process.exit(0);
}

export async function evaluationReportCommand(opts: { comparison: string }): Promise<void> {
  const pool = new Pool(process.env["DATABASE_SSL"] === "true" ? { connectionString: process.env["DATABASE_URL"], ssl: { rejectUnauthorized: false } } : { connectionString: process.env["DATABASE_URL"] });
  const res = await pool.query(
    "SELECT * FROM evaluation_comparisons WHERE id = $1",
    [opts.comparison]
  );

  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    console.error(`✗ Comparison ${opts.comparison} not found`);
    await pool.end();
    process.exit(1);
  }

  console.log(`\n📊 Evaluation Report: ${opts.comparison}`);
  console.log(`  base:      ${row["base_version"]}`);
  console.log(`  candidate: ${row["candidate_version"]}`);
  console.log(`  status:    ${row["status"]}`);

  if (row["status"] === "RUNNING") {
    console.log("\n⏳ Evaluation still running — check back later");
  } else if (row["result"]) {
    const result = row["result"] as Record<string, unknown>;
    console.log("\nResults:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\nNo results available yet");
  }

  await pool.end();
}
