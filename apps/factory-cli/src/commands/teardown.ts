import { rmSync } from "fs";
import { execSync } from "child_process";

export async function teardownCommand(opts: { profile: string }): Promise<void> {
  console.log(`\n🗑  factory teardown [profile: ${opts.profile}]\n`);

  if (opts.profile === "local-dev") {
    // Stop local Docker Compose
    try {
      execSync("docker compose -f infra/local/docker-compose.yaml down -v", { stdio: "inherit" });
      console.log("✓ Docker Compose services stopped");
    } catch {
      console.warn("⚠  Docker Compose not running or not installed");
    }

    // Clean temp sandbox dirs
    const { tmpdir } = await import("os");
    const { readdirSync } = await import("fs");
    const tmp = tmpdir();
    try {
      const dirs = readdirSync(tmp).filter(d => d.startsWith("factory-sandbox-"));
      for (const d of dirs) {
        rmSync(`${tmp}/${d}`, { recursive: true, force: true });
      }
      console.log(`✓ Cleaned ${dirs.length} sandbox temp directories`);
    } catch {
      // best effort
    }

    console.log("\n✓ local-dev teardown complete");
  } else {
    console.log("Teardown for non-local-dev profiles must be performed through Terraform:");
    console.log("  cd infra/terraform && terraform destroy");
  }
}
