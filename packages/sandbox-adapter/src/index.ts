/**
 * sandbox-adapter — OpenSandbox SDK integration
 *
 * Uses the official @alibaba-group/opensandbox TypeScript SDK to create and
 * manage isolated execution environments. The OpenSandbox server must be
 * running before the coordinator starts:
 *
 *   uvx opensandbox-server          # starts on localhost:8080 by default
 *
 * When OPENSANDBOX_DOMAIN is not set, the adapter falls back to plain
 * local temp directories (no container isolation) with a warning.
 *
 * SandboxSession.runCommand() executes commands through the OpenSandbox API,
 * giving real protocol-level integration, not raw docker exec.
 */

import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import crypto from "crypto";
import { ConnectionConfig, Sandbox } from "@alibaba-group/opensandbox";

export interface SandboxConfig {
  mode: "local-docker" | "opensandbox";
  imageDigest?: string;
  cpus?: string;
  memoryMb?: number;
  ttlSeconds?: number;
  opensandboxUrl?: string;
  opensandboxApiKey?: string;
}

export interface SandboxSession {
  id: string;
  workspaceDir: string;
  mode: "local-docker" | "opensandbox";
  createdAt: string;
  expiresAt: string;
  /**
   * OpenSandbox SDK sandbox handle. Present when the sandbox was created via
   * the OpenSandbox server. Used by runCommand() for protocol-level execution.
   */
  sandboxHandle?: Sandbox;
  /**
   * Legacy: set when a plain Docker container was started as a fallback.
   * Used only when OpenSandbox server is unavailable.
   */
  containerId?: string;
}

// ─── OpenSandbox-managed sandbox ─────────────────────────────────────────────
//
// The OpenSandbox server runs locally (uvx opensandbox-server) or remotely.
// It manages the Docker container lifecycle through its own API. We talk to
// it via the official @alibaba-group/opensandbox TypeScript SDK.

class OpenSandboxManagedSandbox {
  private connectionConfig: ConnectionConfig;

  constructor(domain: string, apiKey?: string) {
    this.connectionConfig = new ConnectionConfig({
      domain,
      apiKey,
      protocol: domain.startsWith("https") ? "https" : "http",
    });
  }

  async create(config: SandboxConfig): Promise<SandboxSession> {
    const id = crypto.randomUUID();
    // Host workspace directory — use /tmp explicitly so OpenSandbox can mount it
    // (macOS tmpdir() returns /var/folders/... which may not be on the Docker bind-mount path)
    const workspaceDir = mkdtempSync("/tmp/factory-sandbox-");
    mkdirSync(workspaceDir, { recursive: true });

    const expiresAt = new Date(
      Date.now() + (config.ttlSeconds ?? 3600) * 1000
    ).toISOString();

    // Resolve the image: strip sha256: prefix — OpenSandbox resolves by tag
    const image = config.imageDigest ?? "node:22-alpine";
    const safeImage = image.startsWith("sha256:") ? "node:22-alpine" : image;

    const resource: Record<string, string> = {};
    if (config.cpus) resource["cpu"] = config.cpus;
    if (config.memoryMb) resource["memory"] = `${config.memoryMb}Mi`;

    let sandboxHandle: Sandbox | undefined;

    try {
      sandboxHandle = await Sandbox.create({
        connectionConfig: this.connectionConfig,
        image: safeImage,
        timeoutSeconds: config.ttlSeconds ?? 3600,
        ...(Object.keys(resource).length > 0 ? { resource } : {}),
        // Mount the host workspace directory into /workspace inside the sandbox
        volumes: [
          {
            name: "factory-workspace",
            host: { path: workspaceDir },
            mountPath: "/workspace",
          },
        ],
      });

      console.log(
        `  ✓ OpenSandbox sandbox created: ${sandboxHandle.id} (image: ${safeImage})`
      );
    } catch (e) {
      console.warn(
        `  ⚠ OpenSandbox server unavailable — falling back to plain temp dir: ${(e as Error).message ?? e}`
      );
      // sandboxHandle remains undefined — executor falls back to local execSync
    }

    return {
      id: sandboxHandle?.id ?? id,
      workspaceDir,
      mode: "opensandbox",
      createdAt: new Date().toISOString(),
      expiresAt,
      sandboxHandle,
    };
  }

  async destroy(session: SandboxSession): Promise<void> {
    if (session.sandboxHandle) {
      try {
        await session.sandboxHandle.kill();
        await session.sandboxHandle.close();
        console.log(`  ✓ OpenSandbox sandbox terminated: ${session.id}`);
      } catch (e) {
        console.warn(
          `  ⚠ Could not terminate sandbox ${session.id}: ${(e as Error).message ?? e}`
        );
      }
    }
    // Clean up the host workspace directory
    try {
      rmSync(session.workspaceDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

// ─── Plain temp-dir fallback (no OpenSandbox server, no Docker) ──────────────

class PlainTempDirSandbox {
  async create(config: SandboxConfig): Promise<SandboxSession> {
    const id = crypto.randomUUID();
    const workspaceDir = mkdtempSync(
      path.join(tmpdir(), `factory-sandbox-${id}-`)
    );

    return {
      id,
      workspaceDir,
      mode: "local-docker",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + (config.ttlSeconds ?? 3600) * 1000
      ).toISOString(),
    };
  }

  async destroy(session: SandboxSession): Promise<void> {
    try {
      rmSync(session.workspaceDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

// ─── OpenSandbox API client (remote hosted service) ──────────────────────────

class OpenSandboxApiClient {
  constructor(
    private readonly url: string,
    private readonly apiKey: string
  ) {}

  async create(config: SandboxConfig): Promise<SandboxSession> {
    const id = crypto.randomUUID();
    const workspaceDir = mkdtempSync(
      path.join(tmpdir(), `factory-sandbox-${id}-`)
    );

    const res = await fetch(`${this.url}/v1/sandboxes`, {
      method: "POST",
      headers: {
        "OPEN-SANDBOX-API-KEY": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: config.imageDigest ?? "node:22-alpine",
        resource: {
          cpu: config.cpus ?? "2.0",
          memory: `${config.memoryMb ?? 4096}Mi`,
        },
        timeoutSeconds: config.ttlSeconds ?? 3600,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `OpenSandbox API create failed: ${res.status} ${await res.text()}`
      );
    }

    const data = (await res.json()) as { id: string; expiresAt: string };

    return {
      id: data.id,
      workspaceDir,
      mode: "opensandbox",
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
    };
  }

  async destroy(sessionId: string, apiKey: string): Promise<void> {
    await fetch(`${this.url}/v1/sandboxes/${sessionId}`, {
      method: "DELETE",
      headers: { "OPEN-SANDBOX-API-KEY": apiKey },
    });
  }
}

// ─── Public adapter ──────────────────────────────────────────────────────────

export class SandboxAdapter {
  private opensandboxManaged: OpenSandboxManagedSandbox | null = null;
  private opensandboxApi: OpenSandboxApiClient | null = null;
  private plain = new PlainTempDirSandbox();

  constructor(config: SandboxConfig) {
    if (config.mode === "opensandbox" && config.opensandboxUrl) {
      // Remote OpenSandbox API (hosted service)
      this.opensandboxApi = new OpenSandboxApiClient(
        config.opensandboxUrl,
        config.opensandboxApiKey ?? ""
      );
    } else if (process.env["OPENSANDBOX_DOMAIN"]) {
      // Local OpenSandbox server via official SDK (uvx opensandbox-server)
      this.opensandboxManaged = new OpenSandboxManagedSandbox(
        process.env["OPENSANDBOX_DOMAIN"],
        process.env["OPEN_SANDBOX_API_KEY"]
      );
    }
  }

  async createSession(config: SandboxConfig): Promise<SandboxSession> {
    if (config.mode === "opensandbox" && this.opensandboxApi) {
      return this.opensandboxApi.create(config);
    }
    if (this.opensandboxManaged) {
      return this.opensandboxManaged.create(config);
    }
    // No OpenSandbox server configured — plain temp dir
    console.warn(
      "  ⚠ OPENSANDBOX_DOMAIN not set — using plain temp dir (no sandbox isolation)\n" +
        "    To enable OpenSandbox: uvx opensandbox-server && export OPENSANDBOX_DOMAIN=localhost:8080"
    );
    return this.plain.create(config);
  }

  async destroySession(session: SandboxSession): Promise<void> {
    if (session.sandboxHandle && this.opensandboxManaged) {
      await this.opensandboxManaged.destroy(session);
      return;
    }
    if (session.mode === "opensandbox" && this.opensandboxApi) {
      await this.opensandboxApi.destroy(
        session.id,
        process.env["OPEN_SANDBOX_API_KEY"] ?? ""
      );
      try {
        rmSync(session.workspaceDir, { recursive: true, force: true });
      } catch { /* best effort */ }
      return;
    }
    await this.plain.destroy(session);
  }

  async ping(): Promise<boolean> {
    if (this.opensandboxManaged) {
      try {
        const domain = process.env["OPENSANDBOX_DOMAIN"]!;
        const protocol = domain.startsWith("https") ? "https" : "http";
        const res = await fetch(`${protocol}://${domain}/health`);
        return res.ok;
      } catch {
        return false;
      }
    }
    if (this.opensandboxApi) {
      try {
        const res = await fetch(
          `${(this.opensandboxApi as unknown as { url: string }).url}/health`
        );
        return res.ok;
      } catch {
        return false;
      }
    }
    return true; // plain mode is always available
  }
}

export function createSandboxAdapterFromEnv(): SandboxAdapter {
  const mode = process.env["OPENSANDBOX_URL"] ? "opensandbox" : "local-docker";
  return new SandboxAdapter({
    mode,
    opensandboxUrl: process.env["OPENSANDBOX_URL"],
    opensandboxApiKey: process.env["OPENSANDBOX_API_KEY"],
    imageDigest:
      process.env["OPENSANDBOX_DEFAULT_IMAGE"] ?? "node:22-alpine",
    ttlSeconds: 3600,
  });
}
