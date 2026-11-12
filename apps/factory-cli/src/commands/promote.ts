import { Pool } from "pg";
import yaml from "js-yaml";

export async function promoteCommand(opts: {
  candidate: string;
  decision: string;
}): Promise<void> {
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

  // Verify decision exists and all hard gates passed
  const res = await pool.query(
    "SELECT * FROM promotion_decisions WHERE id = $1",
    [opts.decision]
  );
  const decision = res.rows[0] as Record<string, unknown> | undefined;

  if (!decision) {
    console.error(`✗ PromotionDecision ${opts.decision} not found in database`);
    await pool.end();
    process.exit(1);
  }

  if (decision["candidate_version"] !== opts.candidate) {
    console.error(`✗ Decision ${opts.decision} is for candidate ${decision["candidate_version"]}, not ${opts.candidate}`);
    await pool.end();
    process.exit(1);
  }

  if (decision["decision"] !== "PROMOTE") {
    console.error(`✗ Decision ${opts.decision} is ${decision["decision"]}, not PROMOTE — cannot activate`);
    await pool.end();
    process.exit(1);
  }

  if (!decision["all_hard_gates_passed"]) {
    console.error(`✗ Not all hard gates passed in decision ${opts.decision} — cannot promote`);
    await pool.end();
    process.exit(1);
  }

  console.log(`\n🚀 factory promote`);
  console.log(`  candidate: ${opts.candidate}`);
  console.log(`  decision:  ${opts.decision}`);
  console.log(`  authorized-by: ${decision["authorized_by"]}`);

  // Update active.yaml — the ONLY valid way to change the active release
  const activeYaml = {
    apiVersion: "factory.contract/v1",
    kind: "ActiveRelease",
    activeVersion: opts.candidate,
    activatedAt: new Date().toISOString(),
    activatedBy: decision["authorized_by"],
    promotionDecisionId: opts.decision,
  };

  const { writeFileSync } = await import("fs");
  writeFileSync("factory-releases/active.yaml", yaml.dump(activeYaml));

  // Update Port
  const { createPortClientFromEnv } = await import("@factory/port-client");
  const port = createPortClientFromEnv();
  await port.upsertEntity({
    identifier: `factory-release-${opts.candidate}`,
    blueprint: "factoryRelease",
    properties: { status: "ACTIVE", isActive: true },
  });
  await port.upsertEntity({
    identifier: `factory-release-${decision["base_version"]}`,
    blueprint: "factoryRelease",
    properties: { status: "DEPRECATED", isActive: false },
  });

  console.log(`\n✓ Release ${opts.candidate} is now active`);
  console.log(`  factory-releases/active.yaml updated`);
  console.log(`  Port factoryRelease/${opts.candidate} → ACTIVE`);
  console.log(`\nCommit factory-releases/active.yaml to record the promotion.`);

  await pool.end();
}
