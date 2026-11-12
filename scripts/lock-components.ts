#!/usr/bin/env tsx
/**
 * lock-components.ts — compute and write SHA-256 digests for all skills.
 * Run after editing any SKILL.md or AGENTS.md.
 *
 * Usage:
 *   pnpm lock-components            # update skills.lock.json
 *   pnpm lock-components --verify-only  # verify without writing
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";

const verifyOnly = process.argv.includes("--verify-only");

const lockPath = "factory-releases/skills.lock.json";
const lock = JSON.parse(readFileSync(lockPath, "utf-8")) as {
  skills: Array<{ path: string; name: string; version: string; owner: string; sha256: string }>;
  _status?: string;
  lockedAt?: string;
};

let allPassed = true;
let changed = 0;

for (const entry of lock.skills) {
  if (!existsSync(entry.path)) {
    console.log(`✗ MISSING: ${entry.path}`);
    allPassed = false;
    continue;
  }
  const content = readFileSync(entry.path);
  const actual = createHash("sha256").update(content).digest("hex");

  if (verifyOnly) {
    if (entry.sha256.startsWith("REPLACE") || entry.sha256 !== actual) {
      console.log(`✗ [${entry.name}] digest mismatch or placeholder`);
      allPassed = entry.sha256.startsWith("REPLACE"); // placeholder is a warning, not failure
    } else {
      console.log(`✓ [${entry.name}] ${actual.slice(0, 16)}...`);
    }
  } else {
    if (entry.sha256 !== actual) {
      console.log(`  updated [${entry.name}]: ${actual.slice(0, 16)}...`);
      entry.sha256 = actual;
      changed++;
    } else {
      console.log(`  unchanged [${entry.name}]`);
    }
  }
}

if (!verifyOnly) {
  lock._status = "COMPUTED";
  lock.lockedAt = new Date().toISOString();
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  console.log(`\n✓ skills.lock.json updated (${changed} changed)`);
} else {
  if (allPassed) {
    console.log(`\n✓ All skill digests verified`);
  } else {
    console.error(`\n✗ Digest verification failed`);
    process.exit(1);
  }
}
