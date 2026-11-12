import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

interface SkillLock { path: string; name: string; sha256: string }

export async function registryVerifyCommand(): Promise<void> {
  console.log("\n🔒 factory registry:verify\n");
  const lockPath = "factory-releases/skills.lock.json";

  if (!existsSync(lockPath)) {
    console.error(`✗ skills.lock.json not found — run pnpm lock-components first`);
    process.exit(1);
  }

  const lock = JSON.parse(readFileSync(lockPath, "utf-8")) as { skills: SkillLock[]; _status?: string };

  if (lock._status === "AUTHORING_SOURCE_PENDING_REAL_EXECUTION") {
    console.warn("⚠  skills.lock.json has placeholder SHA-256 values — run pnpm lock-components to populate");
    process.exit(0);
  }

  let allPassed = true;
  for (const entry of lock.skills) {
    if (!existsSync(entry.path)) {
      console.log(`✗ [${entry.name}] MISSING: ${entry.path}`);
      allPassed = false;
      continue;
    }
    const content = readFileSync(entry.path);
    const actual = createHash("sha256").update(content).digest("hex");
    const matches = actual === entry.sha256;
    console.log(`${matches ? "✓" : "✗"} [${entry.name}] ${matches ? "digest OK" : `DIGEST MISMATCH\n  expected: ${entry.sha256}\n  actual:   ${actual}`}`);
    if (!matches) allPassed = false;
  }

  if (allPassed) {
    console.log(`\n✓ All ${lock.skills.length} skills verified`);
  } else {
    console.error("\n✗ Registry verification failed — do not use this release");
    process.exit(1);
  }
}
