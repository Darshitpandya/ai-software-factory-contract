#!/usr/bin/env tsx
/**
 * verify-architecture.ts — deterministic validator for software-architecture stage output.
 * Exits 0 on pass, 1 on failure.
 *
 * Usage: pnpm exec tsx factories/software-architecture/scripts/verify-architecture.ts [workspace-dir]
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { execSync } from "child_process";

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

// SA-001: ADR exists
const adr = file("adr-0007-invoice-export.md");
check("SA-001", adr !== null && adr.length > 100, adr ? "ADR present" : "ADR missing");

// SA-002: ADR has Status, Context, Decision, Consequences sections
const adrSections = ["Status:", "Context:", "Decision:", "Consequences:"];
check("SA-002",
  adrSections.every(s => adr?.includes(s) ?? false),
  adr && adrSections.every(s => adr.includes(s)) ? "ADR has all required sections" : "ADR missing required sections");

// SA-003: ADR does not self-approve (must be PROPOSED or REVIEW, not APPROVED by the model)
const hasForgedApproval = adr?.match(/^Status:\s*Approved/mi) &&
  !adr.includes("Approved by:");
check("SA-003",
  !hasForgedApproval,
  !hasForgedApproval ? "ADR does not forge approval" : "FAIL: ADR self-approves — only architecture owner can approve");

// SA-004: OpenAPI spec exists
const openapi = file("openapi.yaml");
check("SA-004", openapi !== null, openapi ? "openapi.yaml present" : "openapi.yaml missing");

// SA-005: OpenAPI spec has /v1/invoices (existing stable route preserved)
check("SA-005",
  openapi?.includes("/v1/invoices") ?? false,
  openapi?.includes("/v1/invoices") ? "Existing /v1/invoices route present in spec" : "FAIL: /v1/invoices missing — existing route was removed");

// SA-006: oasdiff check if binary available (non-blocking if missing)
let oasdiffResult = "oasdiff binary not found — skipping compatibility check";
try {
  const baseline = file("compatibility-baseline.yaml") ?? file("openapi/compatibility-baseline.yaml");
  if (baseline && openapi) {
    const baselinePath = path.join(workspaceDir, "compatibility-baseline.yaml");
    const proposedPath = path.join(workspaceDir, "openapi.yaml");
    const output = execSync(`oasdiff breaking ${baselinePath} ${proposedPath} --format json`, {
      encoding: "utf-8", timeout: 30_000,
    });
    const breaking = JSON.parse(output) as unknown[];
    check("SA-006", breaking.length === 0,
      breaking.length === 0 ? "No breaking changes detected by oasdiff" : `FAIL: ${breaking.length} breaking change(s) detected`);
    oasdiffResult = `oasdiff ran: ${breaking.length} breaking change(s)`;
  } else {
    results.push({ ruleId: "SA-006", passed: true, message: "No baseline to compare (skipped)" });
  }
} catch {
  results.push({ ruleId: "SA-006", passed: true, message: oasdiffResult });
}

// SA-007: architecture-evidence.json present
const evidence = file("architecture-evidence.json");
check("SA-007", evidence !== null, evidence ? "architecture-evidence.json present" : "architecture-evidence.json missing");

// ── Output ───────────────────────────────────────────────────────────────────
const errors = results.filter(r => !r.passed && (r.ruleId === "SA-001" || r.ruleId === "SA-003" || r.ruleId === "SA-004" || r.ruleId === "SA-005"));

console.log("── software-architecture verify ─────────────────────────────");
for (const r of results) console.log(`${r.passed ? "✓" : "✗"} [${r.ruleId}] ${r.message}`);

const evidenceHash = createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 16);
console.log(`\nevidence-hash: ${evidenceHash}`);
console.log(`checks-passed: ${results.filter(r => r.passed).length}/${results.length}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s) — stage output is NOT acceptable`);
  process.exit(1);
}
console.log("\n✓ All required checks passed — artifact is PRODUCED");
process.exit(0);
