#!/usr/bin/env tsx
/**
 * bootstrap.ts — one-time setup: run migrations, apply Port entities, populate skills.lock.json
 * Usage: pnpm bootstrap
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";

async function main() {
  console.log("🚀 Factory bootstrap\n");

  // 1. Run DB migrations
  const dbUrl = process.env["DATABASE_URL"];
  if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

  console.log("1/4 Running database migrations...");
  const sql = readFileSync("db/migrations/001_init.sql", "utf-8");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: dbUrl });
  await pool.query(sql);
  await pool.end();
  console.log("    ✓ Migrations applied");

  // 2. Lock components
  console.log("2/4 Computing skills.lock.json digests...");
  execSync("pnpm lock-components", { stdio: "inherit" });

  // 3. Port apply
  console.log("3/4 Applying Port control plane...");
  execSync("pnpm factory port:apply", { stdio: "inherit" });

  // 4. Verify registry
  console.log("4/4 Verifying component registry...");
  execSync("pnpm factory registry:verify", { stdio: "inherit" });

  console.log("\n✓ Bootstrap complete. Next: pnpm factory doctor --profile local-dev");
}

main().catch(e => { console.error(e); process.exit(1); });
