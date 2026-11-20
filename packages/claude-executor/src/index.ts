/* eslint-disable @typescript-eslint/no-var-requires */
import Anthropic from "@anthropic-ai/sdk";
import type { FactoryStage, FactoryReleaseConfig, TokenUsage } from "@factory/contract-types";
import { readFileSync } from "fs";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface StageExecutionInput {
  stage: FactoryStage;
  runId: string;
  workOrderId: string;
  factoryRelease: FactoryReleaseConfig;
  contextSnapshot: Record<string, unknown>;
  workspaceDir: string;
  allowedTools: string[];
  maxTurns?: number;
  /**
   * When set, run_command calls are routed through the OpenSandbox SDK's
   * commands.run() API for real protocol-level isolation.
   * Provided by the coordinator from SandboxSession.sandboxHandle.
   * Falls back to local execSync when not provided.
   */
  sandboxCommandRunner?: (cmd: string, cwd?: string) => Promise<string>;
  /**
   * Legacy fallback: when sandboxCommandRunner is not set and this is set,
   * run_command calls are routed through `docker exec <containerId>`.
   */
  containerId?: string;
  /**
   * When set, the executor connects to this MCP server over stdio for Port catalog
   * lookups. The binary is typically `tsx packages/port-mcp-server/src/index.ts`.
   * Falls back gracefully if the server fails to start.
   */
  portMcpBinary?: string;
}

export interface StageExecutionResult {
  success: boolean;
  producedFiles: string[];
  error?: string;
  tokenUsage: TokenUsage;
  modelUsed: string;
  exitCode: number;
}

// ─── MCP client for Port catalog ─────────────────────────────────────────────

interface McpToolInfo {
  client: Client;
  tools: Anthropic.Tool[];
  dispose: () => void;
}

/**
 * Connect to the Port MCP server over stdio.
 * Returns the connected client + Anthropic-formatted tool definitions.
 * Returns null (with a warning) if the server cannot be started.
 */
async function connectPortMcp(binaryPath: string): Promise<McpToolInfo | null> {
  try {
    const transport = new StdioClientTransport({
      command: "tsx",
      args: [binaryPath],
      env: { ...process.env as Record<string, string> },
    });

    const mcpClient = new Client({ name: "factory-executor", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);

    const { tools: mcpTools } = await mcpClient.listTools();

    // Convert MCP tool format to Anthropic tool format
    const anthropicTools: Anthropic.Tool[] = mcpTools.map(t => ({
      name: `mcp__port__${t.name}`,
      description: `[Port MCP] ${t.description ?? t.name}`,
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? {
        type: "object" as const,
        properties: {},
      },
    }));

    console.log(`  ✓ Port MCP server connected (${mcpTools.length} tools: ${mcpTools.map(t => t.name).join(", ")})`);

    return {
      client: mcpClient,
      tools: anthropicTools,
      dispose: () => { transport.close().catch(() => {}); },
    };
  } catch (e) {
    console.warn(`  ⚠ Port MCP server unavailable — falling back to context snapshot: ${(e as Error).message ?? e}`);
    return null;
  }
}

// ─── AGENTS.md and SKILL.md resolution ──────────────────────────────────────

function loadAgentsMd(stage: FactoryStage, repoRoot: string): string {
  const p = path.join(repoRoot, "factories", stage, "AGENTS.md");
  try {
    return readFileSync(p, "utf-8");
  } catch {
    return "";
  }
}

function loadSkills(stage: FactoryStage, repoRoot: string): string {
  const skillsDir = path.join(repoRoot, "factories", stage, "skills");
  const skillDirs = (() => {
    try {
      const { readdirSync } = require("fs");
      return readdirSync(skillsDir) as string[];
    } catch {
      return [];
    }
  })();

  return skillDirs
    .map((dir: string) => {
      const skillPath = path.join(skillsDir, dir, "SKILL.md");
      try {
        return `\n\n---\n# Skill: ${dir}\n\n${readFileSync(skillPath, "utf-8")}`;
      } catch {
        return "";
      }
    })
    .join("");
}

// ─── Tool definitions for Claude ─────────────────────────────────────────────

function buildFactoryTools(allowedTools: string[]): Anthropic.Tool[] {
  const allTools: Anthropic.Tool[] = [
    {
      name: "read_file",
      description: "Read a file from the workspace. Use to inspect existing code, schemas, and configurations.",
      input_schema: {
        type: "object" as const,
        required: ["path"],
        properties: {
          path: { type: "string", description: "Relative path from workspace root" },
        },
      },
    },
    {
      name: "write_file",
      description: "Write content to a file in the workspace. Use to produce stage output artifacts.",
      input_schema: {
        type: "object" as const,
        required: ["path", "content"],
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
      },
    },
    {
      name: "run_command",
      description: "Run an allowlisted shell command in the workspace. Only approved commands are permitted.",
      input_schema: {
        type: "object" as const,
        required: ["command"],
        properties: {
          command: { type: "string", description: "Shell command to run" },
          cwd: { type: "string", description: "Optional working directory (relative)" },
        },
      },
    },
    {
      name: "list_directory",
      description: "List the contents of a directory.",
      input_schema: {
        type: "object" as const,
        required: ["path"],
        properties: {
          path: { type: "string" },
        },
      },
    },
    {
      name: "report_stage_output",
      description: "Report the stage output files and status. Call this when the stage work is complete.",
      input_schema: {
        type: "object" as const,
        required: ["outputFiles", "summary"],
        properties: {
          outputFiles: {
            type: "array",
            items: { type: "string" },
            description: "List of output file paths produced",
          },
          summary: { type: "string", description: "Brief summary of work done" },
          blocked: {
            type: "boolean",
            description: "Set true if stage cannot proceed and needs escalation",
          },
          blockedReason: { type: "string" },
        },
      },
    },
  ];

  return allTools.filter((t) => allowedTools.includes(t.name));
}

// ─── Sandbox tool execution ──────────────────────────────────────────────────

interface ToolResult {
  content: string;
  isError?: boolean;
}

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  workspaceDir: string,
  allowedCommands: string[],
  containerId?: string,
  sandboxCommandRunner?: (cmd: string, cwd?: string) => Promise<string>
): Promise<ToolResult> {
  const { execSync } = await import("child_process");

  switch (toolName) {
    case "read_file": {
      const filePath = path.join(workspaceDir, toolInput["path"] as string);
      try {
        return { content: readFileSync(filePath, "utf-8") };
      } catch (e) {
        return { content: `Error reading file: ${e}`, isError: true };
      }
    }

    case "write_file": {
      const { writeFileSync, mkdirSync } = await import("fs");
      const filePath = path.join(workspaceDir, toolInput["path"] as string);
      try {
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, toolInput["content"] as string, "utf-8");
        return { content: `Written: ${toolInput["path"]}` };
      } catch (e) {
        return { content: `Error writing file: ${e}`, isError: true };
      }
    }

    case "run_command": {
      const cmd = toolInput["command"] as string;
      // Safety: only allow explicitly approved commands
      const isAllowed = allowedCommands.some((allowed) =>
        cmd.startsWith(allowed)
      );
      if (!isAllowed) {
        return {
          content: `Command not in allowlist: ${cmd}`,
          isError: true,
        };
      }
      try {
        let output: string;
        if (sandboxCommandRunner) {
          // Route through OpenSandbox SDK — real protocol-level isolation
          const relCwd = toolInput["cwd"] as string | undefined;
          output = await sandboxCommandRunner(cmd, relCwd);
        } else if (containerId) {
          // Legacy: route through docker exec
          const relCwd = toolInput["cwd"]
            ? `/workspace/${toolInput["cwd"] as string}`
            : "/workspace";
          const escapedCmd = cmd.replace(/"/g, '\\"');
          output = execSync(
            `docker exec ${containerId} sh -c "cd ${relCwd} && ${escapedCmd}"`,
            { encoding: "utf-8", timeout: 120_000 }
          );
        } else {
          const cwd = toolInput["cwd"]
            ? path.join(workspaceDir, toolInput["cwd"] as string)
            : workspaceDir;
          output = execSync(cmd, {
            cwd,
            encoding: "utf-8",
            timeout: 120_000,
          });
        }
        return { content: output };
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        return {
          content: `Exit nonzero:\nstdout: ${err.stdout ?? ""}\nstderr: ${err.stderr ?? err.message ?? ""}`,
          isError: true,
        };
      }
    }

    case "list_directory": {
      const { readdirSync } = await import("fs");
      const dirPath = path.join(workspaceDir, toolInput["path"] as string);
      try {
        const entries = readdirSync(dirPath);
        return { content: entries.join("\n") };
      } catch (e) {
        return { content: `Error listing directory: ${e}`, isError: true };
      }
    }

    case "report_stage_output": {
      return {
        content: JSON.stringify({
          acknowledged: true,
          outputFiles: toolInput["outputFiles"],
          summary: toolInput["summary"],
          blocked: toolInput["blocked"] ?? false,
        }),
      };
    }

    default:
      return { content: `Unknown tool: ${toolName}`, isError: true };
  }
}

// ─── Main executor ───────────────────────────────────────────────────────────

export class ClaudeExecutor {
  private client: Anthropic;
  private repoRoot: string;

  constructor(apiKey: string, repoRoot: string) {
    this.client = new Anthropic({ apiKey });
    this.repoRoot = repoRoot;
  }

  async executeStage(input: StageExecutionInput): Promise<StageExecutionResult> {
    const { stage, factoryRelease, contextSnapshot, workspaceDir, allowedTools, maxTurns = 25, containerId, portMcpBinary, sandboxCommandRunner } = input;

    // Resolve model: stage override > defaultModel
    const model =
      factoryRelease.stageModels?.[stage] ?? factoryRelease.runtime.defaultModel;

    // Build system prompt from AGENTS.md + skills
    const agentsMd = loadAgentsMd(stage, this.repoRoot);
    const skills = loadSkills(stage, this.repoRoot);
    const systemPrompt = buildSystemPrompt(stage, agentsMd, skills, contextSnapshot, input.runId);

    const tools = buildFactoryTools(allowedTools);
    const allowedCommands = getAllowedCommandsForStage(stage);

    // Optionally connect to Port MCP server for real catalog lookups
    const mcpInfo = portMcpBinary
      ? await connectPortMcp(portMcpBinary)
      : null;

    // Merge MCP tools into the tool list (MCP tools are prefixed mcp__port__)
    const allTools = mcpInfo ? [...tools, ...mcpInfo.tools] : tools;

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: buildStagePrompt(stage, contextSnapshot, input.workOrderId),
      },
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let producedFiles: string[] = [];
    let blocked = false;
    let error: string | undefined;

    // Agentic loop
    for (let turn = 0; turn < maxTurns; turn++) {
      const response = await this.client.messages.create({
        model,
        max_tokens: 16000,
        system: systemPrompt,
        tools: allTools,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Collect assistant message
      messages.push({ role: "assistant", content: response.content });

      // Log what Claude is doing
      const toolNames = response.content.filter(b => b.type === "tool_use").map(b => (b as {name: string}).name);
      if (toolNames.length > 0) {
        console.log(`    Turn ${turn + 1}: tools=[${toolNames.join(", ")}]`);
      } else {
        const textPreview = response.content.filter(b => b.type === "text").map(b => (b as {text: string}).text.slice(0, 80)).join(" ");
        console.log(`    Turn ${turn + 1}: end_turn (no tools) — "${textPreview}"`);
      }

      if (response.stop_reason === "end_turn") {
        // No more tool calls; check if stage reported output
        break;
      }

      if (response.stop_reason !== "tool_use") {
        error = `Unexpected stop_reason: ${response.stop_reason}`;
        break;
      }

      // Execute tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        let result: ToolResult;

        // Route MCP-prefixed tools to the MCP server
        if (block.name.startsWith("mcp__port__") && mcpInfo) {
          const mcpToolName = block.name.replace("mcp__port__", "");
          try {
            const mcpResult = await mcpInfo.client.callTool({
              name: mcpToolName,
              arguments: block.input as Record<string, unknown>,
            });
            const contentItems = (mcpResult.content as Array<{ type: string; text?: string }>) ?? [];
            const text = contentItems
              .filter((c) => c.type === "text")
              .map(c => c.text ?? "")
              .join("\n");
            result = { content: text, isError: mcpResult.isError as boolean | undefined };
          } catch (e) {
            result = { content: `MCP call failed: ${(e as Error).message}`, isError: true };
          }
        } else {
          result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            workspaceDir,
            allowedCommands,
            containerId,
            sandboxCommandRunner
          );
        }

        // Capture produced files from report_stage_output
        if (block.name === "report_stage_output") {
          const parsed = JSON.parse(result.content) as {
            outputFiles?: string[];
            blocked?: boolean;
          };
          producedFiles = parsed.outputFiles ?? [];
          blocked = parsed.blocked ?? false;
          console.log(`    report_stage_output: outputFiles=${JSON.stringify(producedFiles)}, blocked=${blocked}`);
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      messages.push({ role: "user", content: toolResults });

      if (blocked) break;
    }

    const finalSuccess = !error && producedFiles.length > 0;
    console.log(`    [DEBUG] error="${error}", blocked=${blocked}, files=${producedFiles.length}, success=${finalSuccess}`);

    // Disconnect MCP server if one was started
    mcpInfo?.dispose();

    return {
      // blocked=true with files produced = PRODUCED (local verify cmd failed but artifacts exist)
      // blocked=true with no files = FAILED (couldn't start work)
      success: finalSuccess,
      producedFiles,
      error: error ?? (blocked && producedFiles.length === 0 ? "Stage blocked before producing any files" : undefined),
      tokenUsage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      modelUsed: model,
      exitCode: finalSuccess ? 0 : 1,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(
  stage: FactoryStage,
  agentsMd: string,
  skills: string,
  context: Record<string, unknown>,
  runId: string
): string {
  return `You are the ${stage} factory stage executor, run ID ${runId}.

AGENTS.md working instructions:
${agentsMd}

Available skills:
${skills}

Factory context snapshot:
${JSON.stringify(context, null, 2)}

WORKSPACE INSTRUCTIONS:
- Your workspace starts with two files: work-order.json (full work order context) and README.md.
- Read work-order.json first to understand the full scope of work.
- Use write_file to produce ALL required output artifacts in the workspace.
- Use list_directory to see what you've written.
- AFTER writing all output files, you MUST call report_stage_output exactly once with:
  - outputFiles: array of relative paths you wrote
  - summary: brief description of what you produced

CRITICAL — MANDATORY FINAL STEP:
You MUST call the report_stage_output tool as your LAST action. If you do not call it, the stage will be marked as FAILED. Do not end your response with text — end it by calling report_stage_output.

RULES (non-negotiable):
1. Produce ONLY the declared output artifacts for this stage. Do not fabricate approvals.
2. Publish PRODUCED status only. Acceptance is set by the independent verifier, not by you.
3. Use only the allowlisted tools provided. Do not attempt to run unapproved commands.
4. Never output credentials, tokens, or secrets to files or tool call arguments.
5. If a required precondition is missing, call report_stage_output with blocked=true and blockedReason.
6. Call report_stage_output exactly once when done — this is NOT optional.`;
}

function buildStagePrompt(
  stage: FactoryStage,
  context: Record<string, unknown>,
  workOrderId: string
): string {
  const outputFiles: Record<FactoryStage, string[]> = {
    "product-requirements":    ["product-spec.md", "acceptance.yaml", "work-items.json"],
    "software-architecture":   ["architecture.md", "openapi-delta.yaml", "adr.md"],
    "software-engineering":    ["implementation-notes.md"],
    "security-compliance":     ["security-review.md", "compliance-checklist.md"],
    "platform-operations":     ["deployment.json", "health-evidence.json", "runbook.md"],
  };
  const required = outputFiles[stage] ?? ["output.md"];

  const stageNotes: Partial<Record<FactoryStage, string>> = {
    "platform-operations": `IMPORTANT: You are producing OPERATIONAL DOCUMENTATION, not running a live deployment.
- deployment.json: JSON document describing the deployment configuration, container spec, rollback strategy
- health-evidence.json: JSON document with smoke test definitions and expected results
- runbook.md: Markdown operational runbook with startup, shutdown, rollback procedures
Write realistic, substantive documentation based on the work order. Do NOT attempt to run docker or deployment commands.`,
    "software-engineering": `SOFTWARE-ENGINEERING STAGE — Produce REAL TypeScript implementation.

Workflow:
1. Read work-order.json for the full scope and requirements.
2. Run list_directory on the workspace root to see what source files are available.
3. If src/ directory exists: read the existing files, then write your modified TypeScript files using write_file.
4. If no src/ directory: create TypeScript implementation files from scratch based on the work order requirements.
5. Write implementation-notes.md summarising: what files were changed, design decisions, how to test.
6. Optionally run pnpm typecheck or pnpm test to verify the code (these are allowlisted).
7. Call report_stage_output(outputFiles=["implementation-notes.md"], summary="...").

CRITICAL: Write real, compilable TypeScript. Do not write placeholder or stub content.
The coordinator will push all files you write to a GitHub branch and open a PR automatically.`,
  };

  const note = stageNotes[stage] ? `\n\n${stageNotes[stage]}` : "";

  return `Execute the ${stage} factory stage for work order ${workOrderId}.

Work order: ${JSON.stringify(context.workOrder ?? {}, null, 2)}
${note}

REQUIRED OUTPUT FILES (you MUST write ALL of these before reporting):
${required.map(f => `  - ${f}`).join("\n")}

EXECUTION ORDER (do not skip steps):
1. Call read_file(path="work-order.json") — load full work order context
2. For EACH required output file: call write_file(path="<filename>", content="<full content>")
   - Write real, substantive content based on the work order scope
   - Do NOT write placeholder content
3. After writing ALL files: call report_stage_output(outputFiles=${JSON.stringify(required)}, summary="...")

You MUST call write_file for EACH file before report_stage_output. Do not call report_stage_output with an empty or partial outputFiles list.`;
}

function getAllowedCommandsForStage(stage: FactoryStage): string[] {
  const base = [
    "pnpm exec tsx",
    "pnpm factory registry:verify",
    "node --version",
  ];

  const stageCommands: Record<FactoryStage, string[]> = {
    "product-requirements": [
      ...base,
      "pnpm exec tsx factories/product-requirements/scripts/verify-requirements.ts",
    ],
    "software-architecture": [
      ...base,
      "pnpm exec tsx factories/software-architecture/scripts/verify-architecture.ts",
      "oasdiff validate",
      "oasdiff breaking",
    ],
    "software-engineering": [
      ...base,
      "pnpm exec tsx factories/software-engineering/scripts/verify-engineering.ts",
      "pnpm install --frozen-lockfile",
      "pnpm typecheck",
      "pnpm test",
      "pnpm build",
    ],
    "security-compliance": [
      ...base,
      "pnpm exec tsx factories/security-compliance/scripts/verify-security.ts",
    ],
    "platform-operations": [
      ...base,
      "pnpm exec tsx factories/platform-operations/scripts/verify-deployment.ts",
      "docker compose",
    ],
  };

  return stageCommands[stage] ?? base;
}

export function createClaudeExecutorFromEnv(repoRoot: string): ClaudeExecutor {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be set");
  return new ClaudeExecutor(apiKey, repoRoot);
}
