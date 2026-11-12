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
import { readFileSync } from "fs";
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

  // Main poll loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
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

    // Idempotency: skip already-accepted stages
    if (await isStageAlreadyAccepted(pool, runId, stage)) {
      console.log(`  ↳ Stage ${stage} already ACCEPTED — advancing`);
      const next = nextStage(stage);
      if (!next) await markRunCompleted(pool, runId, "idempotent");
      return;
    }

    // Load factory release config
    const releasePath = `factory-releases/${run.factoryRelease}/factory-release.yaml`;
    const release = yaml.load(readFileSync(releasePath, "utf-8")) as FactoryReleaseConfig;

    // Create sandbox session
    const session = await sandbox.createSession({
      mode: process.env["OPENSANDBOX_URL"] ? "opensandbox" : "local-docker",
      imageDigest: release.runtime.sandbox.imageDigest,
      cpus: release.runtime.sandbox.resourceLimits?.cpus,
      memoryMb: release.runtime.sandbox.resourceLimits?.memoryMb,
      ttlSeconds: release.runtime.sandbox.resourceLimits?.ttlSeconds,
    });

    await transitionStageStatus(pool, runId, stage, "RUNNING");
    await port.upsertFactoryRun(run);

    // Execute stage via Claude
    const result = await executor.executeStage({
      stage,
      runId,
      workOrderId: run.workOrderId,
      factoryRelease: release,
      contextSnapshot: { workOrder: { id: run.workOrderId } },
      workspaceDir: session.workspaceDir,
      allowedTools: ["read_file", "write_file", "run_command", "list_directory", "report_stage_output"],
    });

    // Build artifact
    const artifact = store.buildArtifact({
      runId,
      stage,
      workspaceDir: session.workspaceDir,
      modelUsed: result.modelUsed,
      factoryRelease: run.factoryRelease,
      tokenUsage: result.tokenUsage,
    });
    store.saveArtifact(artifact);

    // Destroy sandbox after artifact captured
    await sandbox.destroySession(session);

    if (!result.success) {
      await transitionStageStatus(pool, runId, stage, "REJECTED", { error: result.error });
      await markRunFailed(pool, runId, stage, result.error ?? "Stage execution failed");
      console.log(`  ✗ Stage ${stage} failed: ${result.error}`);
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
    }

    // Check if all stages complete
    const updatedRun = await getRun(pool, runId);
    const allDone = FACTORY_STAGES.every(
      s => updatedRun?.stages[s]?.status === "ACCEPTED" || updatedRun?.stages[s]?.status === "SKIPPED"
    );

    if (allDone) {
      await markRunCompleted(pool, runId, artifact.sha256);
      await port.upsertFactoryRun(updatedRun!);
      console.log(`\n✓ Run ${runId} COMPLETED`);
    }
  } finally {
    await releaseLease(pool, runId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
