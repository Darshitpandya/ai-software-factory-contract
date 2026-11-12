import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createPortClientFromEnv } from "@factory/port-client";

export async function portPlanCommand(): Promise<void> {
  console.log("\n📋 factory port:plan — reviewing Port control-plane definitions\n");
  const blueprintDir = "control-plane/port/blueprints";
  const actionDir = "control-plane/port/actions";

  try {
    const blueprints = readdirSync(blueprintDir).filter(f => f.endsWith(".json"));
    console.log(`Blueprints to apply (${blueprints.length}):`);
    for (const b of blueprints) {
      const def = JSON.parse(readFileSync(path.join(blueprintDir, b), "utf-8")) as { identifier: string; title: string };
      console.log(`  • ${def.identifier} — ${def.title}`);
    }
  } catch {
    console.log("  (No blueprint definitions found in control-plane/port/blueprints/)");
  }

  try {
    const actions = readdirSync(actionDir).filter(f => f.endsWith(".json"));
    console.log(`\nActions to apply (${actions.length}):`);
    for (const a of actions) {
      const def = JSON.parse(readFileSync(path.join(actionDir, a), "utf-8")) as { identifier: string; title: string };
      console.log(`  • ${def.identifier} — ${def.title}`);
    }
  } catch {
    console.log("  (No action definitions found)");
  }

  console.log("\nRun `pnpm factory port:apply` to apply these definitions to Port.");
  console.log("Note: Terraform (infra/terraform/) is the preferred approach for initial setup.");
}

export async function portApplyCommand(opts: { dryRun?: boolean }): Promise<void> {
  console.log(`\n🔧 factory port:apply${opts.dryRun ? " (dry run)" : ""}\n`);

  if (opts.dryRun) {
    await portPlanCommand();
    return;
  }

  const port = createPortClientFromEnv();
  const { ok, org } = await port.ping();
  if (!ok) {
    console.error("✗ Cannot reach Port API — check credentials");
    process.exit(1);
  }
  console.log(`✓ Connected to Port org: ${org}`);
  console.log("\nApplying bootstrap entities...");

  // Create initial service entities for reference repos
  const services = [
    { id: "factory-reference-billing-api", title: "Billing API", language: "TypeScript", owner: "billing-domain" },
    { id: "factory-reference-notification-api", title: "Notification API", language: "Python", owner: "notifications-domain" },
  ];

  for (const svc of services) {
    await port.upsertEntity({
      identifier: svc.id,
      blueprint: "service",
      title: svc.title,
      properties: { language: svc.language, owner: svc.owner },
    });
    console.log(`  ✓ service: ${svc.id}`);
  }

  // Create factory releases
  const releases = ["1.4.0", "1.5.0"];
  for (const v of releases) {
    await port.upsertEntity({
      identifier: `factory-release-${v}`,
      blueprint: "factoryRelease",
      title: `Factory Release ${v}`,
      properties: {
        version: v,
        status: v === "1.4.0" ? "ACTIVE" : "CANDIDATE",
        claudeModel: "claude-opus-5-5",
        isActive: v === "1.4.0",
      },
    });
    console.log(`  ✓ factoryRelease: ${v}`);
  }

  console.log("\n✓ Port apply complete");
}
