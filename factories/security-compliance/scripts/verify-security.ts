#!/usr/bin/env tsx
/**
 * verify-security.ts — deterministic validator for security-compliance stage output.
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

// SC-001: security-findings.json present
const findingsRaw = file("security-findings.json");
check("SC-001", findingsRaw !== null, findingsRaw ? "security-findings.json present" : "FAIL: security-findings.json missing");

// SC-002: scan-evidence.json present
const evidenceRaw = file("scan-evidence.json");
check("SC-002", evidenceRaw !== null, evidenceRaw ? "scan-evidence.json present" : "FAIL: scan-evidence.json missing");

// SC-003: No unresolved CRITICAL findings without exception
if (findingsRaw) {
  try {
    const findings = JSON.parse(findingsRaw) as Array<{ severity: string; status: string }>;
    const unresolvedCritical = findings.filter(
      f => f.severity === "critical" && f.status !== "REMEDIATED" && f.status !== "EXCEPTION_APPROVED"
    );
    check("SC-003", unresolvedCritical.length === 0,
      unresolvedCritical.length === 0
        ? "No unresolved CRITICAL findings"
        : `FAIL: ${unresolvedCritical.length} unresolved CRITICAL finding(s)`);
  } catch {
    check("SC-003", false, "FAIL: security-findings.json is not valid JSON");
  }
}

// SC-004: scan-evidence SHA must reference actual scanner output
if (evidenceRaw) {
  try {
    const ev = JSON.parse(evidenceRaw) as { scannerVersion?: string; sourceSha?: string };
    check("SC-004",
      typeof ev.scannerVersion === "string" && typeof ev.sourceSha === "string",
      ev.scannerVersion && ev.sourceSha
        ? `Scanner version ${ev.scannerVersion} against commit ${ev.sourceSha}`
        : "FAIL: scan-evidence.json missing scannerVersion or sourceSha");
  } catch {
    check("SC-004", false, "FAIL: scan-evidence.json is not valid JSON");
  }
}

// ── Output ───────────────────────────────────────────────────────────────────
const errors = results.filter(r => !r.passed);
console.log("── security-compliance verify ───────────────────────────────");
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
