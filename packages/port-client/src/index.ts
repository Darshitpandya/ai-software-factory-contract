import { PortTokenManager } from "./token.js";
import type { FactoryRun, WorkOrder } from "@factory/contract-types";

export { PortTokenManager };

export interface PortClientConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

interface PortEntity {
  identifier: string;
  blueprint: string;
  title?: string;
  properties: Record<string, unknown>;
  relations?: Record<string, string | string[]>;
}

export class PortClient {
  private tokens: PortTokenManager;
  private baseUrl: string;

  constructor(config: PortClientConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.getport.io";
    this.tokens = new PortTokenManager(
      config.clientId,
      config.clientSecret,
      this.baseUrl
    );
  }

  // ── Low-level helpers ───────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.tokens.getToken();
    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Port API ${method} ${path} → ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  }

  // ── Entity operations ───────────────────────────────────────────────────

  async getEntity(blueprint: string, identifier: string): Promise<PortEntity> {
    // Port API wraps single-entity responses: { entity: { ... } }
    const result = await this.request<{ entity: PortEntity }>(
      "GET",
      `/blueprints/${blueprint}/entities/${identifier}`
    );
    return result.entity ?? (result as unknown as PortEntity);
  }

  async upsertEntity(entity: PortEntity): Promise<PortEntity> {
    return this.request<PortEntity>(
      "POST",
      `/blueprints/${entity.blueprint}/entities?upsert=true&merge=true`,
      entity
    );
  }

  async deleteEntity(blueprint: string, identifier: string): Promise<void> {
    await this.request<void>(
      "DELETE",
      `/blueprints/${blueprint}/entities/${identifier}`
    );
  }

  async searchEntities(
    blueprint: string,
    query: Record<string, unknown>
  ): Promise<PortEntity[]> {
    const result = await this.request<{ entities: PortEntity[] }>(
      "POST",
      `/blueprints/${blueprint}/entities/search`,
      query
    );
    return result.entities;
  }

  // ── Action run reporting ─────────────────────────────────────────────────

  async reportActionRunStatus(
    runId: string,
    status: "IN_PROGRESS" | "SUCCESS" | "FAILURE",
    summary?: string,
    link?: string
  ): Promise<void> {
    await this.request("PATCH", `/actions/runs/${runId}`, {
      status,
      summary,
      externalRunId: link,
    });
  }

  async addActionRunLog(runId: string, message: string): Promise<void> {
    await this.request("POST", `/actions/runs/${runId}/logs`, { message });
  }

  // ── Factory-specific helpers ─────────────────────────────────────────────

  async upsertFactoryRun(run: FactoryRun, portActionRunId?: string): Promise<void> {
    const entity: PortEntity = {
      identifier: run.id,
      blueprint: "factoryRun",
      title: `Run ${run.id.slice(0, 8)} — ${run.status}`,
      properties: {
        runId: run.id,
        status: run.status,
        currentStage: run.currentStage ?? null,
        githubRunUrl: run.githubRunUrl ?? null,
        evidenceRef: run.evidenceRef ?? null,
        attemptCount: Object.values(run.stages).reduce(
          (acc, s) => acc + (s?.attempts ?? 0),
          0
        ),
        totalDurationSeconds: run.totalDurationSeconds ?? null,
        stageResults: run.stages,
      },
      relations: {
        workOrder: run.workOrderId,
        // Port entity IDs are prefixed: "factory-release-1.4.0", not "1.4.0"
        factoryRelease: run.factoryRelease.startsWith("factory-release-")
          ? run.factoryRelease
          : `factory-release-${run.factoryRelease}`,
      },
    };
    await this.upsertEntity(entity);

    if (portActionRunId) {
      const summary = `Stage: ${run.currentStage ?? "—"} | Status: ${run.status}`;
      await this.reportActionRunStatus(
        portActionRunId,
        run.status === "COMPLETED"
          ? "SUCCESS"
          : run.status === "FAILED"
          ? "FAILURE"
          : "IN_PROGRESS",
        summary,
        run.githubRunUrl
      );
    }
  }

  async updateWorkOrderStatus(
    workOrderId: string,
    status: WorkOrder["status"]
  ): Promise<void> {
    await this.upsertEntity({
      identifier: workOrderId,
      blueprint: "workOrder",
      properties: { status },
    });
  }

  // ── Health check ─────────────────────────────────────────────────────────

  async ping(): Promise<{ ok: boolean; org?: string }> {
    try {
      const result = await this.request<{ organization: { name: string } }>(
        "GET",
        "/organization"
      );
      return { ok: true, org: result.organization.name };
    } catch {
      return { ok: false };
    }
  }
}

export function createPortClientFromEnv(): PortClient {
  const clientId = process.env["PORT_CLIENT_ID"];
  const clientSecret = process.env["PORT_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("PORT_CLIENT_ID and PORT_CLIENT_SECRET must be set");
  }
  return new PortClient({
    clientId,
    clientSecret,
    baseUrl: process.env["PORT_BASE_URL"] ?? "https://api.getport.io",
  });
}
