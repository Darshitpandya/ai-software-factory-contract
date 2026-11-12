#!/usr/bin/env tsx
import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { runCommand } from "./commands/run.js";
import { resumeCommand } from "./commands/resume.js";
import { portPlanCommand, portApplyCommand } from "./commands/port.js";
import { registryVerifyCommand } from "./commands/registry.js";
import { evaluationRunCommand, evaluationReportCommand } from "./commands/evaluate.js";
import { promoteCommand } from "./commands/promote.js";
import { evidenceVerifyCommand } from "./commands/evidence.js";
import { teardownCommand } from "./commands/teardown.js";

const program = new Command("factory")
  .description("AI Software Factory Contract CLI")
  .version("1.0.0");

program
  .command("doctor")
  .description("Check all prerequisites: Port, Claude, GitHub, database, sandbox")
  .option("--profile <profile>", "Operating profile: local-dev | ci-integration | hardened", "local-dev")
  .action(doctorCommand);

program
  .command("run")
  .description("Start a new factory run from a WorkOrder")
  .requiredOption("--work-order <id>", "Port WorkOrder entity ID")
  .requiredOption("--release <version>", "Factory release version", "1.4.0")
  .option("--dry-run", "Resolve context and validate; do not execute")
  .action(runCommand);

program
  .command("resume")
  .description("Resume an interrupted factory run (idempotent; skips accepted stages)")
  .requiredOption("--run-id <id>", "Factory run ID to resume")
  .option("--from-stage <stage>", "Force resume from a specific stage")
  .action(resumeCommand);

program
  .command("port:plan")
  .description("Show planned Port blueprint/action changes (no mutation)")
  .action(portPlanCommand);

program
  .command("port:apply")
  .description("Idempotently apply Port blueprints, relations, actions, scorecards")
  .option("--dry-run", "Show what would be applied without mutating Port")
  .action(portApplyCommand);

program
  .command("registry:verify")
  .description("Verify component registry: skill digests, MCP scopes, sandbox config")
  .action(registryVerifyCommand);

program
  .command("evaluation:run")
  .description("Run controlled factory evaluation: base vs candidate release")
  .requiredOption("--base <version>", "Base factory release version")
  .requiredOption("--candidate <version>", "Candidate factory release version")
  .option("--suite <path>", "Path to evaluation suite", "evaluation/suite.yaml")
  .action(evaluationRunCommand);

program
  .command("evaluation:report")
  .description("Generate evaluation report from a completed comparison")
  .requiredOption("--comparison <id>", "Evaluation comparison ID")
  .action(evaluationReportCommand);

program
  .command("promote")
  .description("Promote a candidate factory release after a valid evaluation decision")
  .requiredOption("--candidate <version>", "Candidate version to promote")
  .requiredOption("--decision <id>", "PromotionDecision ID")
  .action(promoteCommand);

program
  .command("evidence:verify")
  .description("Verify evidence bundle integrity for a completed run")
  .requiredOption("--run-id <id>", "Factory run ID to verify")
  .action(evidenceVerifyCommand);

program
  .command("teardown")
  .description("Tear down local infrastructure (sandboxes, temp files)")
  .option("--profile <profile>", "Profile", "local-dev")
  .action(teardownCommand);

program.parse(process.argv);
