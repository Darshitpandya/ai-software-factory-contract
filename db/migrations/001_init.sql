-- Factory coordinator state — PostgreSQL migration 001
-- Apply with: psql $DATABASE_URL < db/migrations/001_init.sql

BEGIN;

CREATE TABLE IF NOT EXISTS factory_runs (
    id              TEXT PRIMARY KEY,
    work_order_id   TEXT NOT NULL,
    factory_release TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','BLOCKED','WAITING_FOR_HUMAN','COMPLETED','FAILED','CANCELLED')),
    current_stage   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    github_run_url  TEXT,
    evidence_ref    TEXT,
    total_duration_seconds INTEGER,
    error_json      JSONB,
    metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_factory_runs_status ON factory_runs(status);
CREATE INDEX IF NOT EXISTS idx_factory_runs_work_order ON factory_runs(work_order_id);

CREATE TABLE IF NOT EXISTS stage_executions (
    id              TEXT PRIMARY KEY,
    run_id          TEXT NOT NULL REFERENCES factory_runs(id),
    stage           TEXT NOT NULL,
    attempt         INTEGER NOT NULL DEFAULT 1,
    status          TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','PRODUCED','ACCEPTED','REJECTED','BLOCKED','SKIPPED')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    artifact_ref    TEXT,
    acceptance_ref  TEXT,
    model_used      TEXT,
    token_usage     JSONB,
    error           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    UNIQUE(run_id, stage, attempt)
);

CREATE INDEX IF NOT EXISTS idx_stage_executions_run ON stage_executions(run_id);

-- Durable outbox for Port status updates (guarantees delivery even after worker crash)
CREATE TABLE IF NOT EXISTS outbox_events (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(processed_at) WHERE processed_at IS NULL;

-- Leases prevent duplicate stage execution by multiple coordinator workers
CREATE TABLE IF NOT EXISTS run_leases (
    run_id          TEXT PRIMARY KEY,
    worker_id       TEXT NOT NULL,
    acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    stage           TEXT NOT NULL
);

-- Event deduplication for GitHub webhook delivery IDs
CREATE TABLE IF NOT EXISTS processed_events (
    delivery_id     TEXT PRIMARY KEY,
    event_type      TEXT NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stage human approvals
CREATE TABLE IF NOT EXISTS stage_approvals (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    run_id          TEXT NOT NULL REFERENCES factory_runs(id),
    stage           TEXT NOT NULL,
    decision        TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
    approved_by     TEXT NOT NULL,
    rationale       TEXT,
    port_action_run_id TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evaluation comparisons
CREATE TABLE IF NOT EXISTS evaluation_comparisons (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    base_version    TEXT NOT NULL,
    candidate_version TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
    suite_digest    TEXT,
    result          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Promotion decisions (append-only)
CREATE TABLE IF NOT EXISTS promotion_decisions (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    comparison_id   TEXT NOT NULL REFERENCES evaluation_comparisons(id),
    base_version    TEXT NOT NULL,
    candidate_version TEXT NOT NULL,
    decision        TEXT NOT NULL CHECK (decision IN ('PROMOTE','HOLD','REJECT')),
    authorized_by   TEXT NOT NULL,
    rationale       TEXT,
    all_hard_gates_passed BOOLEAN NOT NULL,
    evaluation_summary JSONB NOT NULL,
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER factory_runs_updated_at
    BEFORE UPDATE ON factory_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
