import type { Pool } from "pg";
import {
  type FactoryRun,
  type FactoryStage,
  type FactoryRunStatus,
  type StageRecord,
  type StageStatus,
  FACTORY_STAGES,
  nextStage,
} from "@factory/contract-types";
import crypto from "crypto";

// ─── Lease management ────────────────────────────────────────────────────────

export interface LeaseAcquisition {
  acquired: boolean;
  workerId: string;
}

export async function acquireLease(
  pool: Pool,
  runId: string,
  stage: string,
  ttlSeconds = 300
): Promise<LeaseAcquisition> {
  const workerId = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO run_leases (run_id, worker_id, stage, acquired_at, expires_at)
       VALUES ($1, $2, $3, NOW(), NOW() + ($4 || ' seconds')::INTERVAL)
       ON CONFLICT (run_id) DO UPDATE
         SET worker_id = $2, stage = $3, acquired_at = NOW(),
             expires_at = NOW() + ($4 || ' seconds')::INTERVAL
         WHERE run_leases.expires_at < NOW()`,
      [runId, workerId, stage, ttlSeconds]
    );
    // Verify we won the race
    const res = await pool.query(
      "SELECT worker_id FROM run_leases WHERE run_id = $1",
      [runId]
    );
    const winner = (res.rows[0] as { worker_id: string } | undefined)?.worker_id;
    return { acquired: winner === workerId, workerId };
  } catch {
    return { acquired: false, workerId };
  }
}

export async function releaseLease(pool: Pool, runId: string): Promise<void> {
  await pool.query("DELETE FROM run_leases WHERE run_id = $1", [runId]);
}

// ─── Run CRUD ────────────────────────────────────────────────────────────────

export async function createRun(
  pool: Pool,
  run: Omit<FactoryRun, "updatedAt" | "stages">
): Promise<FactoryRun> {
  const stages: Partial<Record<FactoryStage, StageRecord>> = {};
  for (const s of FACTORY_STAGES) {
    stages[s] = { status: "PENDING", attempts: 0 };
  }

  await pool.query(
    `INSERT INTO factory_runs
       (id, work_order_id, factory_release, status, current_stage, created_at, updated_at, github_run_url, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)`,
    [
      run.id,
      run.workOrderId,
      run.factoryRelease,
      run.status,
      run.currentStage ?? FACTORY_STAGES[0],
      run.createdAt,
      run.githubRunUrl ?? null,
      JSON.stringify(stages),
    ]
  );

  return { ...run, updatedAt: run.createdAt, stages };
}

export async function getRun(
  pool: Pool,
  runId: string
): Promise<FactoryRun | null> {
  const res = await pool.query(
    `SELECT id, work_order_id, factory_release, status, current_stage,
            created_at, updated_at, completed_at, github_run_url,
            evidence_ref, total_duration_seconds, error_json, metadata
     FROM factory_runs WHERE id = $1`,
    [runId]
  );
  const row = res.rows[0];
  if (!row) return null;

  return rowToRun(row as Record<string, unknown>);
}

function rowToRun(row: Record<string, unknown>): FactoryRun {
  return {
    id: row["id"] as string,
    workOrderId: row["work_order_id"] as string,
    factoryRelease: row["factory_release"] as string,
    status: row["status"] as FactoryRunStatus,
    currentStage: row["current_stage"] as FactoryStage | undefined,
    createdAt: (row["created_at"] as Date).toISOString(),
    updatedAt: (row["updated_at"] as Date).toISOString(),
    completedAt: row["completed_at"]
      ? (row["completed_at"] as Date).toISOString()
      : undefined,
    githubRunUrl: row["github_run_url"] as string | undefined,
    evidenceRef: row["evidence_ref"] as string | undefined,
    totalDurationSeconds: row["total_duration_seconds"] as number | undefined,
    stages: (row["metadata"] as Partial<Record<FactoryStage, StageRecord>>) ?? {},
    error: row["error_json"]
      ? (row["error_json"] as FactoryRun["error"])
      : undefined,
  };
}

// ─── Stage transitions (the core state machine) ──────────────────────────────

export async function transitionStageStatus(
  pool: Pool,
  runId: string,
  stage: FactoryStage,
  newStatus: StageStatus,
  patch?: Partial<StageRecord>
): Promise<void> {
  // Load current stages from metadata
  const res = await pool.query(
    "SELECT metadata FROM factory_runs WHERE id = $1 FOR UPDATE",
    [runId]
  );
  const row = res.rows[0];
  if (!row) throw new Error(`Run ${runId} not found`);

  const stages = row.metadata as Partial<Record<FactoryStage, StageRecord>>;
  const current = stages[stage] ?? { status: "PENDING" as StageStatus, attempts: 0 };

  const updated: StageRecord = {
    ...current,
    ...patch,
    status: newStatus,
    attempts:
      newStatus === "RUNNING"
        ? current.attempts + 1
        : current.attempts,
  };

  if (newStatus === "RUNNING") updated.startedAt = new Date().toISOString();
  if (newStatus === "ACCEPTED" || newStatus === "REJECTED") {
    updated.completedAt = new Date().toISOString();
  }

  stages[stage] = updated;

  // Determine overall run status
  let runStatus: FactoryRunStatus = "RUNNING";
  if (newStatus === "REJECTED" || newStatus === "BLOCKED") {
    runStatus = "BLOCKED";
  } else if (newStatus === "ACCEPTED") {
    const next = nextStage(stage);
    if (!next) {
      runStatus = "COMPLETED";
    }
  }

  await pool.query(
    `UPDATE factory_runs
     SET metadata = $1, status = $2, current_stage = $3, updated_at = NOW()
     WHERE id = $4`,
    [
      JSON.stringify(stages),
      runStatus,
      // Keep last stage name when COMPLETED so board shows the final column, not N/A
      runStatus === "COMPLETED" ? stage : newStatus === "RUNNING" ? stage : (nextStage(stage) ?? stage),
      runId,
    ]
  );
}

export async function markRunCompleted(
  pool: Pool,
  runId: string,
  evidenceRef: string
): Promise<void> {
  const start = await pool.query(
    "SELECT created_at FROM factory_runs WHERE id = $1",
    [runId]
  );
  const createdAt = start.rows[0]?.created_at as Date;
  const durationSeconds = Math.floor(
    (Date.now() - createdAt.getTime()) / 1000
  );

  await pool.query(
    `UPDATE factory_runs
     SET status = 'COMPLETED', completed_at = NOW(), evidence_ref = $1,
         total_duration_seconds = $2, updated_at = NOW()
     WHERE id = $3`,
    [evidenceRef, durationSeconds, runId]
  );
}

export async function markRunFailed(
  pool: Pool,
  runId: string,
  stage: string,
  message: string,
  code = "STAGE_FAILED"
): Promise<void> {
  await pool.query(
    `UPDATE factory_runs
     SET status = 'FAILED', updated_at = NOW(),
         error_json = $1
     WHERE id = $2`,
    [JSON.stringify({ stage, message, code }), runId]
  );
}

// ─── Idempotency guard ───────────────────────────────────────────────────────

export async function isStageAlreadyAccepted(
  pool: Pool,
  runId: string,
  stage: FactoryStage
): Promise<boolean> {
  const run = await getRun(pool, runId);
  return run?.stages[stage]?.status === "ACCEPTED";
}
