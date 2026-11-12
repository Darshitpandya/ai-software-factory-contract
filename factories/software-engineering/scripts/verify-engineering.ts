#!/usr/bin/env tsx
/**
 * verify-engineering.ts — deterministic validator for software-engineering stage output.
 * Exits 0 on pass, 1 on failure.
 *
 * Usage: pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts [workspace-dir]
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

// SE-001: execution-manifest.json present
const manifest = file("execution-manifest.json");
check("SE-001", manifest !== null, manifest ? "execution-manifest.json present" : "execution-manifest.json missing");

// SE-002: PR URL present in manifest
let prUrl: string | null = null;
if (manifest) {
  try {
    const m = JSON.parse(manifest) as { prUrl?: string; prNumber?: number };
    prUrl = m.prUrl ?? null;
    check("SE-002", prUrl !== null && prUrl.startsWith("https://github.com"),
      prUrl ? `PR URL: ${prUrl}` : "FAIL: prUrl missing or invalid in execution-manifest.json");
  } catch {
    check("SE-002", false, "FAIL: execution-manifest.json is not valid JSON");
  }
}

// SE-003: test-results.json present and all tests passed
const testResults = file("test-results.json");
let allTestsPassed = false;
if (testResults) {
  try {
    const tr = JSON.parse(testResults) as { passed: number; failed: number; total: number };
    allTestsPassed = tr.failed === 0 && tr.total > 0;
    check("SE-003", allTestsPassed,
      allTestsPassed ? `${tr.passed}/${tr.total} tests passed` : `FAIL: ${tr.failed} test(s) failed`);
  } catch {
    check("SE-003", false, "FAIL: test-results.json invalid");
  }
} else {
  check("SE-003", false, "FAIL: test-results.json missing — tests must actually run");
}

// SE-004: No unscoped database query (look for query without tenant filter)
const srcFiles = ["src/db/queries.ts", "src/db/queries.js", "db/queries.ts"];
for (const srcFile of srcFiles) {
  const src = file(srcFile);
  if (src) {
    // Simple heuristic: SELECT without WHERE tenant (not exhaustive, real check is integration test)
    const hasDangerousQuery = /SELECT\s+\*\s+FROM\s+invoices(?!\s+WHERE)/i.test(src);
    check("SE-004", !hasDangerousQuery,
      !hasDangerousQuery ? `No unscoped SELECT detected in ${srcFile}` : `FAIL: Possible unscoped query in ${srcFile}`);
  }
}

// SE-005: headSha present (commit was actually created)
if (manifest) {
  try {
    const m = JSON.parse(manifest) as { headSha?: string };
    check("SE-005", typeof m.headSha === "string" && m.headSha.length === 40,
      m.headSha ? `Head SHA: ${m.headSha}` : "FAIL: headSha missing — no real commit detected");
  } catch {}
}

// ── Output ───────────────────────────────────────────────────────────────────
const errors = results.filter(r => !r.passed);

console.log("── software-engineering verify ──────────────────────────────");
for (const r of results) console.log(`${r.passed ? "✓" : "✗"} [${r.ruleId}] ${r.message}`);

const evidenceHash = createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16);
console.log(`\nevidence-hash: ${evidenceHash}`);
console.log(`checks-passed: ${results.filter(r => r.passed).length}/${results.length}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s) — stage output NOT acceptable`);
  process.exit(1);
}
console.log("\n✓ All required checks passed — artifact is PRODUCED (acceptance requires trusted verifier check)");
process.exit(0);
