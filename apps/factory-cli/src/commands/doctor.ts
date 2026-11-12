import { createPortClientFromEnv } from "@factory/port-client";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export async function doctorCommand(opts: { profile: string }): Promise<void> {
  console.log(`\n🔍 factory doctor  [profile: ${opts.profile}]\n`);
  const checks: CheckResult[] = [];

  // ── 1. Environment variables ───────────────────────────────────────────────
  const required = ["PORT_CLIENT_ID", "PORT_CLIENT_SECRET", "ANTHROPIC_API_KEY", "DATABASE_URL"];
  const optional = ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY_PATH", "OPENSANDBOX_URL"];

  for (const v of required) {
    const present = !!process.env[v];
    checks.push({
      name: `env:${v}`,
      passed: present,
      detail: present ? "set" : `MISSING — set in .env or environment`,
    });
  }

  for (const v of optional) {
    const present = !!process.env[v];
    checks.push({ name: `env:${v} (optional)`, passed: true, detail: present ? "set" : "not set (optional)" });
  }

  // ── 2. Port API connectivity ───────────────────────────────────────────────
  try {
    const port = createPortClientFromEnv();
    const { ok, org } = await port.ping();
    checks.push({ name: "port:api", passed: ok, detail: ok ? `org: ${org}` : "UNREACHABLE — check PORT_CLIENT_ID/SECRET" });
  } catch (e) {
    checks.push({ name: "port:api", passed: false, detail: `ERROR: ${e}` });
  }

  // ── 3. Database connectivity ───────────────────────────────────────────────
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
    await pool.query("SELECT 1");
    await pool.end();
    checks.push({ name: "database:postgres", passed: true, detail: "connected" });
  } catch (e) {
    checks.push({ name: "database:postgres", passed: false, detail: `UNREACHABLE: ${e}` });
  }

  // ── 4. Anthropic API key validation (non-secret check) ────────────────────
  const apiKey = process.env["ANTHROPIC_API_KEY"] ?? "";
  const keyValid = apiKey.startsWith("sk-ant-") && apiKey.length > 20;
  checks.push({
    name: "anthropic:key-format",
    passed: keyValid,
    detail: keyValid ? "key format looks valid" : "key format invalid (expected sk-ant-...)",
  });

  // ── 5. Factory releases exist ─────────────────────────────────────────────
  const { existsSync } = await import("fs");
  const releases = ["factory-releases/active.yaml", "factory-releases/1.4.0/factory-release.yaml"];
  for (const rel of releases) {
    const exists = existsSync(rel);
    checks.push({ name: `releases:${rel}`, passed: exists, detail: exists ? "found" : "MISSING" });
  }

  // ── 6. Skills lock integrity ───────────────────────────────────────────────
  const lockExists = existsSync("factory-releases/skills.lock.json");
  const lockContent = lockExists ? (await import("fs")).readFileSync("factory-releases/skills.lock.json", "utf-8") : "";
  const lockPending = lockContent.includes("REPLACE_WITH_ACTUAL");
  checks.push({
    name: "registry:skills-lock",
    passed: lockExists && !lockPending,
    detail: !lockExists
      ? "MISSING — run pnpm lock-components"
      : lockPending
      ? "WARNING: skills.lock.json has placeholder SHA-256 values — run pnpm lock-components"
      : "skills.lock.json present and populated",
  });

  // ── 7. OpenSandbox (optional for local-dev) ──────────────────────────────
  if (opts.profile === "ci-integration" || opts.profile === "hardened") {
    const sandboxUrl = process.env["OPENSANDBOX_URL"];
    if (sandboxUrl) {
      try {
        const res = await fetch(`${sandboxUrl}/health`);
        checks.push({ name: "sandbox:opensandbox", passed: res.ok, detail: res.ok ? "healthy" : `HTTP ${res.status}` });
      } catch (e) {
        checks.push({ name: "sandbox:opensandbox", passed: false, detail: `UNREACHABLE: ${e}` });
      }
    } else {
      checks.push({ name: "sandbox:opensandbox", passed: false, detail: "OPENSANDBOX_URL not set — required for ci-integration profile" });
    }
  } else {
    checks.push({ name: "sandbox:local-docker", passed: true, detail: "local-dev mode: using temp directories" });
  }

  // ── 8. GitHub App prerequisites ────────────────────────────────────────────
  const ghAppId = process.env["GITHUB_APP_ID"];
  const ghKeyPath = process.env["GITHUB_APP_PRIVATE_KEY_PATH"];
  const ghKeyExists = ghKeyPath ? existsSync(ghKeyPath) : false;
  checks.push({
    name: "github:app",
    passed: !!(ghAppId && ghKeyExists),
    detail: ghAppId && ghKeyExists
      ? `App ID: ${ghAppId}, key at ${ghKeyPath}`
      : "GITHUB_APP_ID or key file missing — PR dispatch unavailable",
  });

  // ── Print results ─────────────────────────────────────────────────────────
  const passed = checks.filter((c) => c.passed);
  const failed = checks.filter((c) => !c.passed);

  console.log("Results:");
  for (const c of checks) {
    const icon = c.passed ? "✓" : "✗";
    console.log(`  ${icon}  ${c.name.padEnd(40)} ${c.detail}`);
  }

  console.log(`\n${passed.length}/${checks.length} checks passed`);

  if (failed.length > 0) {
    const hardFail = failed.filter(
      (c) =>
        c.name.startsWith("env:PORT") ||
        c.name.startsWith("port:api") ||
        c.name.startsWith("database:") ||
        c.name.startsWith("env:ANTHROPIC")
    );
    if (hardFail.length > 0) {
      console.error(`\n✗ ${hardFail.length} blocking prerequisite(s) failed — resolve before running factory`);
      process.exit(1);
    } else {
      console.warn(`\n⚠  ${failed.length} non-blocking warning(s) — review before production use`);
      process.exit(0);
    }
  } else {
    console.log("\n✓ All checks passed");
    process.exit(0);
  }
}
