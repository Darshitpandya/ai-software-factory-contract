/**
 * Factory Coordinator — stateful worker that drives factory runs through all 5 stages.
 *
 * Polling loop:
 *   1. Find PENDING or RUNNING runs in the database
 *   2. Acquire a lease (prevents duplicate execution by multiple workers)
 *   3. Determine the current stage
 *   4. Execute the stage using ClaudeExecutor + SandboxAdapter
 *   5. Wait for the trusted verifier's check (for software-engineering stage)
 *   6. Record StageDecision and advance to next stage
 *   7. Release lease; loop
 */

import { Pool } from "pg";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  getRun,
  transitionStageStatus,
  markRunCompleted,
  markRunFailed,
  acquireLease,
  releaseLease,
  isStageAlreadyAccepted,
} from "@factory/state-machine";
import { createPortClientFromEnv } from "@factory/port-client";
import { createClaudeExecutorFromEnv } from "@factory/claude-executor";
import { createSandboxAdapterFromEnv } from "@factory/sandbox-adapter";
import { ArtifactStore } from "@factory/artifact-store";
import { waitForAcceptanceCheck, checkResultToDecision } from "@factory/acceptance-client";
import {
  FACTORY_STAGES,
  nextStage,
  type FactoryStage,
  type FactoryReleaseConfig,
} from "@factory/contract-types";

const POLL_INTERVAL_MS = 10_000;
const REPOROOT = path.resolve(".");

async function main(): Promise<void> {
  console.log("🏭 Factory Coordinator starting...");
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  const port = createPortClientFromEnv();
  const executor = createClaudeExecutorFromEnv(REPOROOT);
  const sandbox = createSandboxAdapterFromEnv();
  const store = new ArtifactStore({ storeDir: "evidence/runs" });

  // Ping prerequisites
  const portPing = await port.ping();
  if (!portPing.ok) {
    console.error("✗ Cannot reach Port API — exiting");
    process.exit(1);
  }
  console.log(`✓ Port connected (org: ${portPing.org})`);
  console.log(`✓ Coordinator ready. Polling every ${POLL_INTERVAL_MS / 1000}s...`);
  console.log(`  → Watching Port for PENDING runs and PostgreSQL for queued runs`);

  // Main poll loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Sync any PENDING Port entities that have no DB record yet
      // This handles runs created via GitHub Actions self-service action
      await syncPendingFromPort(pool, port);
      await processOneRun(pool, port, executor, sandbox, store);
    } catch (e) {
      console.error("Coordinator loop error:", e);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function processOneRun(
  pool: Pool,
  port: ReturnType<typeof createPortClientFromEnv>,
  executor: ReturnType<typeof createClaudeExecutorFromEnv>,
  sandbox: ReturnType<typeof createSandboxAdapterFromEnv>,
  store: ArtifactStore
): Promise<void> {
  // Find one PENDING or RUNNING run
  const res = await pool.query(
    `SELECT id, current_stage FROM factory_runs
     WHERE status IN ('PENDING','RUNNING')
     ORDER BY created_at ASC LIMIT 1`
  );
  const row = res.rows[0] as { id: string; current_stage: FactoryStage } | undefined;
  if (!row) return;

  const runId = row.id;
  const stage = row.current_stage ?? FACTORY_STAGES[0];

  // Acquire lease
  const { acquired } = await acquireLease(pool, runId, stage, 600);
  if (!acquired) return; // Another worker has it

  console.log(`\n[${runId}] Processing stage: ${stage}`);

  try {
    const run = await getRun(pool, runId);
    if (!run) return;

    // Idempotency: skip already-accepted stages and advance current_stage in DB
    if (await isStageAlreadyAccepted(pool, runId, stage)) {
      console.log(`  ↳ Stage ${stage} already ACCEPTED — advancing to next`);
      const next = nextStage(stage);
      if (!next) {
        await markRunCompleted(pool, runId, "idempotent");
        const updRun = await getRun(pool, runId);
        if (updRun) await port.upsertFactoryRun(updRun);
      } else {
        // Advance current_stage so next poll processes the right stage
        await pool.query(
          "UPDATE factory_runs SET current_stage=$1, updated_at=NOW() WHERE id=$2",
          [next, runId]
        );
      }
      return;
    }

    // Load factory release config
    const releasePath = `factory-releases/${run.factoryRelease}/factory-release.yaml`;
    const release = yaml.load(readFileSync(releasePath, "utf-8")) as FactoryReleaseConfig;

    // Fetch full work order from Port to give Claude proper context
    let workOrderContext: Record<string, unknown> = { id: run.workOrderId };
    try {
      const wo = await port.getEntity("workOrder", run.workOrderId);
      workOrderContext = {
        id: wo.identifier,
        title: wo.title ?? run.workOrderId,
        scope: wo.properties["scope"] ?? "",
        requestedBy: wo.properties["requestedBy"] ?? "",
        releaseVersion: wo.properties["releaseVersion"] ?? run.factoryRelease,
        targetService: wo.properties["targetService"] ?? "",
        status: wo.properties["status"] ?? "PENDING",
      };
      console.log(`  ✓ WorkOrder context loaded: "${workOrderContext.title}"`);
      console.log(`  scope: ${workOrderContext.scope}`);
    } catch (e) {
      console.warn(`  ⚠ Could not fetch WorkOrder from Port: ${e} — using minimal context`);
    }

    // Create sandbox session
    const session = await sandbox.createSession({
      mode: process.env["OPENSANDBOX_URL"] ? "opensandbox" : "local-docker",
      imageDigest: release.runtime.sandbox.imageDigest,
      cpus: release.runtime.sandbox.resourceLimits?.cpus,
      memoryMb: release.runtime.sandbox.resourceLimits?.memoryMb,
      ttlSeconds: release.runtime.sandbox.resourceLimits?.ttlSeconds,
    });

    await transitionStageStatus(pool, runId, stage, "RUNNING");
    // Push live status to Port immediately — stage starts
    const runAtStart = await getRun(pool, runId);
    if (runAtStart) {
      const metrics = computeRunMetrics(runId);
      const runTitle = `${workOrderContext.title as string} · ${run.factoryRelease}`;
      await port.upsertFactoryRun(runAtStart, undefined, {
        ...(metrics.totalTokens > 0 ? metrics : {}),
        runTitle,
      });
    }

    // Seed workspace with context files so Claude can read them
    const { writeFileSync, mkdirSync } = await import("fs");
    mkdirSync(session.workspaceDir, { recursive: true });
    writeFileSync(
      path.join(session.workspaceDir, "work-order.json"),
      JSON.stringify({ ...workOrderContext, runId, factoryRelease: run.factoryRelease, stage }, null, 2),
      "utf-8"
    );
    writeFileSync(
      path.join(session.workspaceDir, "README.md"),
      `# Factory Run Workspace\n\nRun ID: ${runId}\nStage: ${stage}\nWork Order: ${workOrderContext.title}\nScope: ${workOrderContext.scope}\n\nRead \`work-order.json\` for full context. Write output files here, then call \`report_stage_output\`.\n`,
      "utf-8"
    );
    console.log(`  ✓ Workspace seeded: ${session.workspaceDir}`);

    // Execute stage via Claude
    const result = await executor.executeStage({
      stage,
      runId,
      workOrderId: run.workOrderId,
      factoryRelease: release,
      contextSnapshot: { workOrder: workOrderContext },
      workspaceDir: session.workspaceDir,
      allowedTools: ["read_file", "write_file", "run_command", "list_directory", "report_stage_output"],
    });

    // Copy produced files from workspace into evidence dir before building artifact
    const evidenceDir = path.join("evidence/runs", runId, stage, "workspace");
    const { mkdirSync: mkd, cpSync } = await import("fs");
    try {
      mkd(evidenceDir, { recursive: true });
      cpSync(session.workspaceDir, evidenceDir, { recursive: true });
      console.log(`  ✓ Workspace copied to evidence: ${evidenceDir}`);
    } catch (e) {
      console.warn(`  ⚠ Could not copy workspace to evidence: ${e}`);
    }

    // Build artifact (read from persisted evidence dir)
    const artifact = store.buildArtifact({
      runId,
      stage,
      workspaceDir: evidenceDir,
      modelUsed: result.modelUsed,
      factoryRelease: run.factoryRelease,
      tokenUsage: result.tokenUsage,
    });
    store.saveArtifact(artifact);

    // Destroy sandbox after artifact captured
    await sandbox.destroySession(session);

    if (!result.success) {
      const errMsg = result.error ?? (result.producedFiles.length === 0 ? "Stage produced no output files — Claude did not call report_stage_output" : "Stage execution failed");
      await transitionStageStatus(pool, runId, stage, "REJECTED", { error: errMsg });
      await markRunFailed(pool, runId, stage, errMsg);
      // Push failed state to Port
      const runFailed = await getRun(pool, runId);
      if (runFailed) {
        const metrics = computeRunMetrics(runId);
        const runTitle = `${workOrderContext.title as string} · ${run.factoryRelease}`;
        await port.upsertFactoryRun(runFailed, undefined, {
          ...(metrics.totalTokens > 0 ? metrics : {}),
          runTitle,
        });
      }
      console.log(`  ✗ Stage ${stage} failed: ${errMsg}`);
      return;
    }

    // For software-engineering: wait for independent check from trusted verifier
    if (stage === "software-engineering" && process.env["GITHUB_TOKEN"]) {
      console.log(`  ⏳ Waiting for factory-contract/acceptance check...`);
      const manifestContent = result.producedFiles.includes("execution-manifest.json")
        ? JSON.parse(readFileSync(path.join(session.workspaceDir, "execution-manifest.json"), "utf-8")) as { headSha?: string; prOwner?: string; prRepo?: string }
        : {};

      if (manifestContent.headSha && manifestContent.prOwner && manifestContent.prRepo) {
        const check = await waitForAcceptanceCheck({
          owner: manifestContent.prOwner,
          repo: manifestContent.prRepo,
          headSha: manifestContent.headSha,
          githubToken: process.env["GITHUB_TOKEN"]!,
        });

        const decision = checkResultToDecision(runId, stage, artifact.id, check);

        if (decision.decision === "ACCEPTED") {
          await transitionStageStatus(pool, runId, stage, "ACCEPTED", {
            artifactRef: artifact.sha256,
            acceptanceRef: decision.evidenceRef,
          });
          console.log(`  ✓ Stage ${stage} ACCEPTED by trusted verifier`);
        } else {
          await transitionStageStatus(pool, runId, stage, "REJECTED", {
            artifactRef: artifact.sha256,
            acceptanceRef: decision.evidenceRef,
            error: `Verifier rejected: ${check.output.summary ?? check.conclusion}`,
          });
          await markRunFailed(pool, runId, stage, "Independent verifier rejected the PR");
          console.log(`  ✗ Stage ${stage} REJECTED by trusted verifier — PR blocked`);
          return;
        }
      } else {
        // No PR created — mark produced and wait for human
        await transitionStageStatus(pool, runId, stage, "PRODUCED", { artifactRef: artifact.sha256 });
        console.log(`  ⚠ Stage ${stage} produced artifacts but no PR found — WAITING`);
        return;
      }
    } else {
      // For other stages: internal acceptance check
      await transitionStageStatus(pool, runId, stage, "ACCEPTED", { artifactRef: artifact.sha256 });
      console.log(`  ✓ Stage ${stage} ACCEPTED (internal check)`);
      // Push accepted stage + running metrics to Port immediately
      const runAfterAccept = await getRun(pool, runId);
      if (runAfterAccept) {
        const metrics = computeRunMetrics(runId);
        const runTitle = `${workOrderContext.title as string} · ${run.factoryRelease}`;
        await port.upsertFactoryRun(runAfterAccept, undefined, { ...metrics, runTitle });
        if (metrics.totalTokens > 0) {
          console.log(`  → tokens so far: ${metrics.totalTokens.toLocaleString()} | ~$${metrics.estimatedCostUsd.toFixed(4)}`);
        }
      }
    }

    // Check if all stages complete
    const updatedRun = await getRun(pool, runId);
    const allDone = FACTORY_STAGES.every(
      s => updatedRun?.stages[s]?.status === "ACCEPTED" || updatedRun?.stages[s]?.status === "SKIPPED"
    );

    if (allDone) {
      await markRunCompleted(pool, runId, artifact.sha256);
      const finalRun = await getRun(pool, runId);
      if (finalRun) {
        const finalMetrics = computeRunMetrics(runId);
        // Build stage model breakdown markdown table
        const breakdownMd = buildStageModelBreakdownMd(runId);
        const runTitle = `${workOrderContext.title as string} · ${run.factoryRelease}`;
        await port.upsertFactoryRun(finalRun, undefined, {
          ...finalMetrics,
          stageModelBreakdown: breakdownMd ?? undefined,
          runTitle,
        });
        console.log(`\n✓ Run ${runId} COMPLETED`);
        console.log(`  model: ${finalMetrics.modelUsed}`);
        console.log(`  total tokens: ${finalMetrics.totalTokens.toLocaleString()} (in: ${finalMetrics.totalInputTokens.toLocaleString()}, out: ${finalMetrics.totalOutputTokens.toLocaleString()})`);
        console.log(`  estimated cost: $${finalMetrics.estimatedCostUsd.toFixed(4)}`);
      }
    }
  } finally {
    await releaseLease(pool, runId);
  }
}

// ── Compute token metrics from evidence artifacts ─────────────────────────────
function computeRunMetrics(
  runId: string,
  storeDir = "evidence/runs"
): { totalInputTokens: number; totalOutputTokens: number; totalTokens: number; modelUsed: string; estimatedCostUsd: number } {
  const runDir = path.join(storeDir, runId);

  let totalIn = 0;
  let totalOut = 0;
  let totalCost = 0;
  const tokensByModel: Record<string, number> = {};

  if (!existsSync(runDir)) return { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, modelUsed: "", estimatedCostUsd: 0 };

  for (const stage of readdirSync(runDir)) {
    const stageDir = path.join(runDir, stage);
    if (stage === "workspace") continue;
    try {
      for (const artDir of readdirSync(stageDir)) {
        const artFile = path.join(stageDir, artDir, "artifact.json");
        if (existsSync(artFile)) {
          const art = JSON.parse(readFileSync(artFile, "utf-8")) as {
            tokenUsage?: { inputTokens?: number; outputTokens?: number };
            modelUsed?: string;
          };
          const artIn = art.tokenUsage?.inputTokens ?? 0;
          const artOut = art.tokenUsage?.outputTokens ?? 0;
          const model = art.modelUsed ?? "claude-opus-5-5";
          totalIn += artIn;
          totalOut += artOut;
          // Track tokens by model for dominant model detection
          tokensByModel[model] = (tokensByModel[model] ?? 0) + artIn + artOut;
          // Cost per artifact using its own model
          totalCost += calculateCost(artIn, artOut, model);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  // Use the model that handled the most tokens as the display model
  const modelUsed = Object.entries(tokensByModel)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "claude-opus-5-5";

  return {
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
    totalTokens: totalIn + totalOut,
    modelUsed,
    estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
  };
}

// ── Token cost pricing table ──────────────────────────────────────────────────
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "claude-opus-5-5":   { inputPerM: 15.0,  outputPerM: 75.0  },
  "claude-sonnet-5-5": { inputPerM: 3.0,   outputPerM: 15.0  },
  "claude-haiku-5-5":  { inputPerM: 0.25,  outputPerM: 1.25  },
  "claude-fable-5-2":  { inputPerM: 1.0,   outputPerM: 5.0   },
};

function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["claude-opus-5-5"];
  return (inputTokens / 1_000_000) * pricing.inputPerM +
         (outputTokens / 1_000_000) * pricing.outputPerM;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Build per-stage model breakdown markdown table ────────────────────────────
const STAGE_ORDER = [
  "product-requirements", "software-architecture",
  "software-engineering", "security-compliance", "platform-operations",
] as const;

const STAGE_LABEL: Record<string, string> = {
  "product-requirements":  "PRD",
  "software-architecture": "ARCH",
  "software-engineering":  "ENG",
  "security-compliance":   "SEC",
  "platform-operations":   "OPS",
};

function buildStageModelBreakdownMd(runId: string, storeDir = "evidence/runs"): string | null {
  const runDir = path.join(storeDir, runId);
  if (!existsSync(runDir)) return null;

  const rows: string[] = [];
  let totalIn = 0, totalOut = 0, totalCost = 0;

  for (const stage of STAGE_ORDER) {
    const stageDir = path.join(runDir, stage);
    if (!existsSync(stageDir)) continue;

    // Find latest artifact (by sorted dir name desc)
    const artDirs = readdirSync(stageDir)
      .filter(d => d !== "workspace" && existsSync(path.join(stageDir, d, "artifact.json")))
      .sort()
      .reverse();

    if (artDirs.length === 0) continue;

    try {
      const art = JSON.parse(readFileSync(path.join(stageDir, artDirs[0], "artifact.json"), "utf-8")) as {
        tokenUsage?: { inputTokens?: number; outputTokens?: number };
        modelUsed?: string;
      };
      const artIn = art.tokenUsage?.inputTokens ?? 0;
      const artOut = art.tokenUsage?.outputTokens ?? 0;
      const model = art.modelUsed ?? "unknown";
      const cost = calculateCost(artIn, artOut, model);
      totalIn += artIn;
      totalOut += artOut;
      totalCost += cost;
      const label = STAGE_LABEL[stage] ?? stage;
      rows.push(`| ${label} | \`${model}\` | ${artIn.toLocaleString()} | ${artOut.toLocaleString()} | $${cost.toFixed(4)} |`);
    } catch { /* skip */ }
  }

  if (rows.length === 0) return null;

  rows.push(`| **Total** | | **${totalIn.toLocaleString()}** | **${totalOut.toLocaleString()}** | **$${totalCost.toFixed(4)}** |`);

  return [
    "| Stage | Model | Input Tokens | Output Tokens | Cost |",
    "|-------|-------|-------------|--------------|------|",
    ...rows,
  ].join("\n");
}

// ── Sync Port PENDING entities → DB ─────────────────────────────────────────
// When a self-service action creates a factoryRun entity in Port (via GitHub Actions),
// the coordinator picks it up here and creates the matching DB record so it can process.

async function syncPendingFromPort(
  pool: Pool,
  port: ReturnType<typeof createPortClientFromEnv>
): Promise<void> {
  try {
    // GET all factoryRun entities and filter PENDING client-side
    // (Port /entities/search has different format requirements — simpler to filter here)
    const allRuns = await port.searchEntities("factoryRun", {});

    const pendingRuns = allRuns.filter(
      (e) => (e.properties["status"] as string) === "PENDING"
    );

    for (const portRun of pendingRuns) {
      const runId = portRun.identifier;
      const existing = await pool.query(
        "SELECT id FROM factory_runs WHERE id = $1",
        [runId]
      );
      if (existing.rows.length > 0) continue;

      // Extract work order and release from Port entity relations/properties
      const workOrderId =
        (portRun.relations?.["workOrder"] as string) ??
        (portRun.properties?.["workOrder"] as string) ??
        runId;
      const releaseRaw =
        (portRun.relations?.["factoryRelease"] as string) ??
        (portRun.properties?.["factoryRelease"] as string) ??
        "1.4.0";
      const factoryRelease = releaseRaw.replace("factory-release-", "");

      await pool.query(
        `INSERT INTO factory_runs
           (id, work_order_id, factory_release, status, current_stage,
            created_at, updated_at, metadata)
         VALUES ($1,$2,$3,'PENDING','product-requirements',NOW(),NOW(),$4)
         ON CONFLICT (id) DO NOTHING`,
        [runId, workOrderId, factoryRelease, JSON.stringify({})]
      );
      console.log(`\n✓ Synced Port PENDING run → DB: ${runId}`);
      console.log(`  workOrder=${workOrderId}  release=${factoryRelease}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Port sync warning: ${e}`);
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
