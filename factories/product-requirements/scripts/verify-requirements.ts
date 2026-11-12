#!/usr/bin/env tsx
/**
 * verify-requirements.ts
 *
 * Deterministic validator for the product-requirements factory stage output.
 * Exits 0 on success, 1 on any failure.
 *
 * Usage: pnpm exec tsx factories/product-requirements/scripts/verify-requirements.ts [workspace-dir]
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const workspaceDir = process.argv[2] ?? process.cwd();

interface ValidationResult {
  ruleId: string;
  passed: boolean;
  message: string;
}

const results: ValidationResult[] = [];

function check(ruleId: string, condition: boolean, message: string): void {
  results.push({ ruleId, passed: condition, message });
}

function fileContent(relPath: string): string | null {
  const full = path.join(workspaceDir, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf-8");
}

// ── PR-SCHEMA-001: product-spec.md exists and is non-empty ───────────────────
const spec = fileContent("product-spec.md");
check("PR-SCHEMA-001", spec !== null && spec.trim().length > 50,
  spec ? "product-spec.md present and non-empty" : "product-spec.md missing or empty");

// ── PR-SCHEMA-002: acceptance.yaml exists ─────────────────────────────────────
const acceptance = fileContent("acceptance.yaml");
check("PR-SCHEMA-002", acceptance !== null && acceptance.trim().length > 10,
  acceptance ? "acceptance.yaml present" : "acceptance.yaml missing");

// ── PR-SCHEMA-003: work-items.json is valid JSON ─────────────────────────────
const workItemsRaw = fileContent("work-items.json");
let workItemsValid = false;
let workItemsMsg = "work-items.json missing";
if (workItemsRaw) {
  try {
    const parsed = JSON.parse(workItemsRaw) as unknown;
    const items = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown[] }).items;
    workItemsValid = Array.isArray(items) && items.length > 0;
    workItemsMsg = workItemsValid
      ? `work-items.json valid, ${items?.length ?? 0} item(s)`
      : "work-items.json has no items";
  } catch {
    workItemsMsg = "work-items.json is not valid JSON";
  }
}
check("PR-SCHEMA-003", workItemsValid, workItemsMsg);

// ── PR-CONTENT-001: tenant isolation present ─────────────────────────────────
check(
  "PR-CONTENT-001",
  spec?.toLowerCase().includes("tenant") ?? false,
  spec?.toLowerCase().includes("tenant")
    ? "Tenant isolation addressed in product-spec.md"
    : "FAIL: tenant isolation not addressed — add explicit tenant isolation requirement"
);

// ── PR-CONTENT-002: backward compatibility in acceptance.yaml ────────────────
check(
  "PR-CONTENT-002",
  acceptance?.toLowerCase().includes("compatib") ?? false,
  acceptance?.toLowerCase().includes("compatib")
    ? "Backward compatibility criterion present in acceptance.yaml"
    : "FAIL: backward compatibility criterion missing from acceptance.yaml"
);

// ── PR-CONTENT-003: requirement IDs referenced ───────────────────────────────
const hasReqIds = acceptance?.includes("requirementId") ?? false;
check(
  "PR-CONTENT-003",
  hasReqIds,
  hasReqIds
    ? "Requirement IDs present in acceptance.yaml"
    : "WARNING: no requirementId references found in acceptance.yaml"
);

// ── Output ────────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.passed);
const errors = failed.filter((r) => r.ruleId.startsWith("PR-SCHEMA") || r.ruleId === "PR-CONTENT-001" || r.ruleId === "PR-CONTENT-002");

console.log("── product-requirements verify ──────────────────────────────");
for (const r of results) {
  const icon = r.passed ? "✓" : "✗";
  console.log(`${icon} [${r.ruleId}] ${r.message}`);
}
console.log("");

// Compute evidence hash
const evidenceHash = createHash("sha256")
  .update(JSON.stringify(results))
  .digest("hex")
  .slice(0, 16);

console.log(`evidence-hash: ${evidenceHash}`);
console.log(`checks-passed: ${results.filter(r => r.passed).length}/${results.length}`);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s) — stage output is NOT acceptable`);
  process.exit(1);
}

console.log("\n✓ All required checks passed — artifact is PRODUCED (not yet ACCEPTED)");
process.exit(0);
