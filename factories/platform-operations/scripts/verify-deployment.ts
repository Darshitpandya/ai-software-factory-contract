#!/usr/bin/env tsx
/**
 * verify-deployment.ts — deterministic validator for platform-operations stage output.
 * Exits 0 on pass, 1 on failure.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const workspaceDir = process.argv[2] ?? process.cwd();

interface Result { ruleId: string; passed: boolean; message: string }
const results: Result[] = [];

function check(ruleId: string, passed: boolean, message: string) {
  results.push({ ruleId, passed, message });
}

function file(rel: string): string | null {
  const full = path.join(workspaceDir, rel);
  return existsSync(full) ? readFileSync(full, "utf-8") : null;
}

// PO-001: deployment.json present
const deployRaw = file("deployment.json");
check("PO-001", deployRaw !== null, deployRaw ? "deployment.json present" : "FAIL: deployment.json missing");

// PO-002: health-evidence.json present
const healthRaw = file("health-evidence.json");
check("PO-002", healthRaw !== null, healthRaw ? "health-evidence.json present" : "FAIL: health-evidence.json missing");

// PO-003: deployment healthy
if (deployRaw) {
  try {
    const d = JSON.parse(deployRaw) as { status?: string; deploymentId?: string };
    check("PO-003", d.status === "HEALTHY",
      d.status === "HEALTHY"
        ? `Deployment ${d.deploymentId} is HEALTHY`
        : `FAIL: Deployment status is ${d.status ?? "unknown"} — not HEALTHY`);
  } catch {
    check("PO-003", false, "FAIL: deployment.json invalid JSON");
  }
}

// PO-004: rollback target present
if (deployRaw) {
  try {
    const d = JSON.parse(deployRaw) as { rollbackImageDigest?: string };
    check("PO-004", typeof d.rollbackImageDigest === "string" && d.rollbackImageDigest.length > 0,
      d.rollbackImageDigest ? `Rollback target: ${d.rollbackImageDigest}` : "FAIL: No rollback target specified");
  } catch {}
}

// PO-005: health checks timestamp present (proves actual check ran)
if (healthRaw) {
  try {
    const h = JSON.parse(healthRaw) as { checkedAt?: string; httpStatus?: number };
    const isRecent = h.checkedAt
      ? Date.now() - new Date(h.checkedAt).getTime() < 30 * 60 * 1000
      : false;
    check("PO-005", isRecent && h.httpStatus === 200,
      isRecent && h.httpStatus === 200
        ? `Health check OK (${h.httpStatus}) at ${h.checkedAt}`
        : `FAIL: Health check stale or failed (status=${h.httpStatus}, at=${h.checkedAt})`);
  } catch {
    check("PO-005", false, "FAIL: health-evidence.json invalid");
  }
}

// ── Output ───────────────────────────────────────────────────────────────────
const errors = results.filter(r => !r.passed);
console.log("── platform-operations verify ───────────────────────────────");
for (const r of results) console.log(`${r.passed ? "✓" : "✗"} [${r.ruleId}] ${r.message}`);

const evidenceHash = createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16);
console.log(`\nevidence-hash: ${evidenceHash}`);
console.log(`checks-passed: ${results.filter(r => r.passed).length}/${results.length}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s)`);
  process.exit(1);
}
console.log("\n✓ All required checks passed — artifact is PRODUCED");
process.exit(0);
