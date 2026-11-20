import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import crypto from "crypto";

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
  /** Set when a real Docker container is running. Executor uses this for docker exec. */
  containerId?: string;
}

// ─── Local Docker sandbox ────────────────────────────────────────────────────
//
// Creates a real Docker container with the workspace mounted as a volume.
// Falls back gracefully to a plain temp directory if Docker is unavailable.

class LocalSandbox {
  async create(config: SandboxConfig): Promise<SandboxSession> {
    const id = crypto.randomUUID();
    // Workspace lives on the host; it is mounted into the container as /workspace
    const workspaceDir = mkdtempSync(path.join(tmpdir(), `factory-sandbox-${id}-`));

    const expiresAt = new Date(
      Date.now() + (config.ttlSeconds ?? 3600) * 1000
    ).toISOString();

    const session: SandboxSession = {
      id,
      workspaceDir,
      mode: "local-docker",
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    // Resolve image: strip sha256: prefix for `docker run` if needed
    const image = config.imageDigest ?? "node:22-alpine";
    const safeImage = image.startsWith("sha256:") ? "node:22-alpine" : image;
    const containerName = `factory-sandbox-${id.slice(0, 8)}`;

    try {
      const { execSync } = await import("child_process");
      execSync(
        `docker run -d --rm --name ${containerName} -v "${workspaceDir}:/workspace" ${safeImage} tail -f /dev/null`,
        { stdio: "pipe", timeout: 30_000 }
      );
      session.containerId = containerName;
      console.log(`  ✓ Docker container started: ${containerName} (image: ${safeImage})`);
    } catch (e) {
      console.warn(
        `  ⚠ Docker unavailable — workspace isolation falls back to plain temp dir: ${(e as Error).message ?? e}`
      );
      // containerId remains undefined; executor uses local execSync
    }

    return session;
  }

  async destroy(session: SandboxSession): Promise<void> {
    // Stop the Docker container before removing the workspace directory
    if (session.containerId) {
      try {
        const { execSync } = await import("child_process");
        execSync(`docker rm -f ${session.containerId}`, { stdio: "pipe", timeout: 15_000 });
        console.log(`  ✓ Docker container stopped: ${session.containerId}`);
      } catch (e) {
        console.warn(`  ⚠ Could not stop container ${session.containerId}: ${(e as Error).message ?? e}`);
      }
    }
    // Always clean up the host workspace directory
    try {
      rmSync(session.workspaceDir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }

  async copyIn(session: SandboxSession, sourcePath: string, destRelPath: string): Promise<void> {
    const { cpSync } = await import("fs");
    const dest = path.join(session.workspaceDir, destRelPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(sourcePath, dest, { recursive: true });
  }

  async copyOut(session: SandboxSession, srcRelPath: string, destPath: string): Promise<void> {
    const { cpSync } = await import("fs");
    const src = path.join(session.workspaceDir, srcRelPath);
    mkdirSync(path.dirname(destPath), { recursive: true });
    cpSync(src, destPath, { recursive: true });
  }
}

// ─── OpenSandbox API client ───────────────────────────────────────────────────

class OpenSandboxClient {
  constructor(
    private readonly url: string,
    private readonly apiKey: string
  ) {}

  async create(config: SandboxConfig): Promise<SandboxSession> {
    const res = await fetch(`${this.url}/v1/sandboxes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: config.imageDigest,
        cpus: config.cpus ?? "2.0",
        memoryMb: config.memoryMb ?? 4096,
        ttlSeconds: config.ttlSeconds ?? 3600,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenSandbox create failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      id: string;
      workspaceDir: string;
      expiresAt: string;
    };

    return {
      id: data.id,
      workspaceDir: data.workspaceDir,
      mode: "opensandbox",
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
    };
  }

  async destroy(sessionId: string): Promise<void> {
    await fetch(`${this.url}/v1/sandboxes/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}

// ─── Public adapter ──────────────────────────────────────────────────────────

export class SandboxAdapter {
  private local = new LocalSandbox();
  private opensandbox: OpenSandboxClient | null = null;

  constructor(config: SandboxConfig) {
    if (config.mode === "opensandbox" && config.opensandboxUrl) {
      this.opensandbox = new OpenSandboxClient(
        config.opensandboxUrl,
        config.opensandboxApiKey ?? ""
      );
    }
  }

  async createSession(config: SandboxConfig): Promise<SandboxSession> {
    if (config.mode === "opensandbox" && this.opensandbox) {
      return this.opensandbox.create(config);
    }
    return this.local.create(config);
  }

  async destroySession(session: SandboxSession): Promise<void> {
    if (session.mode === "opensandbox" && this.opensandbox) {
      await this.opensandbox.destroy(session.id);
      return;
    }
    await this.local.destroy(session);
  }

  async ping(): Promise<boolean> {
    if (this.opensandbox) {
      try {
        const res = await fetch(
          `${(this.opensandbox as unknown as { url: string }).url}/health`
        );
        return res.ok;
      } catch {
        return false;
      }
    }
    // Local mode is always available
    return true;
  }
}

export function createSandboxAdapterFromEnv(): SandboxAdapter {
  const mode = process.env["OPENSANDBOX_URL"] ? "opensandbox" : "local-docker";
  return new SandboxAdapter({
    mode,
    opensandboxUrl: process.env["OPENSANDBOX_URL"],
    opensandboxApiKey: process.env["OPENSANDBOX_API_KEY"],
    imageDigest: process.env["OPENSANDBOX_DEFAULT_IMAGE"] ?? "node:22-alpine",
    ttlSeconds: 3600,
  });
}
