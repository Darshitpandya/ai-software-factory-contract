import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";
import type { StageArtifact, ArtifactFile, FactoryStage } from "@factory/contract-types";
import crypto from "crypto";

export interface ArtifactStoreConfig {
  storeDir: string; // local directory for evidence storage
}

export class ArtifactStore {
  constructor(private readonly config: ArtifactStoreConfig) {
    mkdirSync(config.storeDir, { recursive: true });
  }

  // ── Collect and hash all files in a directory ────────────────────────────

  collectFiles(dir: string, baseDir = dir): ArtifactFile[] {
    const results: ArtifactFile[] = [];
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = path.relative(baseDir, full);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...this.collectFiles(full, baseDir));
      } else {
        const content = readFileSync(full);
        const sha256 = createHash("sha256").update(content).digest("hex");
        results.push({
          path: rel,
          sha256,
          sizeBytes: stat.size,
          mimeType: guessMime(entry),
        });
      }
    }
    return results;
  }

  // ── Compute bundle SHA-256 over sorted file hashes ───────────────────────

  bundleSha256(files: ArtifactFile[]): string {
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
    const hash = createHash("sha256");
    for (const f of sorted) hash.update(`${f.path}:${f.sha256}\n`);
    return hash.digest("hex");
  }

  // ── Persist artifact manifest ─────────────────────────────────────────────

  saveArtifact(artifact: StageArtifact): void {
    const dir = path.join(
      this.config.storeDir,
      artifact.runId,
      artifact.stage,
      String(artifact.id)
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "artifact.json"),
      JSON.stringify(artifact, null, 2)
    );
  }

  // ── Load artifact manifest ────────────────────────────────────────────────

  loadArtifact(runId: string, stage: FactoryStage, artifactId: string): StageArtifact {
    const p = path.join(this.config.storeDir, runId, stage, artifactId, "artifact.json");
    return JSON.parse(readFileSync(p, "utf-8")) as StageArtifact;
  }

  // ── Build a complete StageArtifact from workspace files ──────────────────

  buildArtifact(opts: {
    runId: string;
    stage: FactoryStage;
    workspaceDir: string;
    modelUsed: string;
    factoryRelease: string;
    tokenUsage?: StageArtifact["tokenUsage"];
    baseRepoSha?: string;
    sandboxId?: string;
  }): StageArtifact {
    const files = this.collectFiles(opts.workspaceDir);
    const bundleHash = this.bundleSha256(files);

    return {
      id: crypto.randomUUID(),
      runId: opts.runId,
      stage: opts.stage,
      producedAt: new Date().toISOString(),
      files,
      sha256: bundleHash,
      producerStatus: "PRODUCED",
      modelUsed: opts.modelUsed,
      factoryRelease: opts.factoryRelease,
      tokenUsage: opts.tokenUsage,
      baseRepoSha: opts.baseRepoSha,
      sandboxId: opts.sandboxId,
    };
  }

  // ── Verify stored artifact integrity ─────────────────────────────────────

  verifyArtifact(artifact: StageArtifact, workspaceDir: string): boolean {
    const freshFiles = this.collectFiles(workspaceDir);
    const freshHash = this.bundleSha256(freshFiles);
    return freshHash === artifact.sha256;
  }
}

function guessMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".json": "application/json",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
    ".md": "text/markdown",
    ".ts": "text/x-typescript",
    ".js": "text/javascript",
    ".txt": "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}
