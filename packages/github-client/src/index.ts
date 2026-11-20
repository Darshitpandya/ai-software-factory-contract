import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

export interface GitHubClientConfig {
  appId: string;
  privateKey: string;
  installationId: number;
  webhookSecret?: string;
}

export interface PullRequestInfo {
  number: number;
  url: string;
  headSha: string;
  baseSha: string;
  state: string;
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
}

export class GitHubProducerClient {
  private app: App;
  private installationId: number;
  private _octokit: Octokit | null = null;

  constructor(config: GitHubClientConfig) {
    this.app = new App({
      appId: config.appId,
      privateKey: config.privateKey,
      webhooks: { secret: config.webhookSecret ?? "" },
    });
    this.installationId = config.installationId;
  }

  private async octokit(): Promise<Octokit> {
    if (!this._octokit) {
      this._octokit = (await this.app.getInstallationOctokit(
        this.installationId
      )) as unknown as Octokit;
    }
    return this._octokit;
  }

  // ── Read operations (permitted in all stages) ─────────────────────────

  async getFileContents(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent> {
    const kit = await this.octokit();
    const res = await kit.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(res.data) || res.data.type !== "file") {
      throw new Error(`${path} is not a file`);
    }
    return {
      path,
      content: Buffer.from(res.data.content, "base64").toString("utf-8"),
      sha: res.data.sha,
    };
  }

  async getLatestCommitSha(
    owner: string,
    repo: string,
    branch = "main"
  ): Promise<string> {
    const kit = await this.octokit();
    const res = await kit.repos.getBranch({ owner, repo, branch });
    return res.data.commit.sha;
  }

  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<PullRequestInfo> {
    const kit = await this.octokit();
    const res = await kit.pulls.get({ owner, repo, pull_number: prNumber });
    return {
      number: res.data.number,
      url: res.data.html_url,
      headSha: res.data.head.sha,
      baseSha: res.data.base.sha,
      state: res.data.state,
    };
  }

  // ── Write operations (software-engineering stage only) ────────────────

  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromSha: string
  ): Promise<void> {
    const kit = await this.octokit();
    await kit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    });
  }

  async pushFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    existingSha?: string
  ): Promise<string> {
    const kit = await this.octokit();
    const res = await kit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      sha: existingSha,
    });
    return res.data.commit.sha ?? "";
  }

  async createPullRequest(
    owner: string,
    repo: string,
    opts: {
      title: string;
      body: string;
      head: string;
      base?: string;
    }
  ): Promise<PullRequestInfo> {
    const kit = await this.octokit();
    const res = await kit.pulls.create({
      owner,
      repo,
      title: opts.title,
      body: opts.body,
      head: opts.head,
      base: opts.base ?? "main",
    });
    return {
      number: res.data.number,
      url: res.data.html_url,
      headSha: res.data.head.sha,
      baseSha: res.data.base.sha,
      state: res.data.state,
    };
  }

  // ── Dispatch a workflow_dispatch event ───────────────────────────────

  async dispatchWorkflow(
    owner: string,
    repo: string,
    workflow: string,
    ref: string,
    inputs: Record<string, string>
  ): Promise<void> {
    const kit = await this.octokit();
    await kit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: workflow,
      ref,
      inputs,
    });
  }

  // ── Ping ─────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const kit = await this.octokit();
      await kit.apps.getInstallation({ installation_id: this.installationId });
      return true;
    } catch {
      return false;
    }
  }
}

export function createGitHubClientFromEnv(): GitHubProducerClient {
  const appId = process.env["FACTORY_APP_ID"];
  const installationId = process.env["FACTORY_APP_INSTALLATION_ID"];

  if (!appId || !installationId) {
    throw new Error(
      "FACTORY_APP_ID and FACTORY_APP_INSTALLATION_ID must be set"
    );
  }

  // Private key: prefer inline env var (Railway/cloud), fall back to file path (local dev)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync, writeFileSync, existsSync } = require("fs") as typeof import("fs");

  let privateKey: string;

  const keyContent = process.env["FACTORY_APP_PRIVATE_KEY_CONTENT"];
  const keyPath = process.env["FACTORY_APP_PRIVATE_KEY_PATH"];

  if (keyContent) {
    // Railway / cloud deployment: key provided as env var content
    // Write to a temp file so the Octokit App constructor can consume it
    const tmpPath = "/tmp/factory_app_key.pem";
    if (!existsSync(tmpPath)) {
      writeFileSync(tmpPath, keyContent.replace(/\\n/g, "\n"), "utf-8");
    }
    privateKey = keyContent.replace(/\\n/g, "\n");
  } else if (keyPath) {
    // Local dev: key provided as a file path
    privateKey = readFileSync(keyPath, "utf-8");
  } else {
    throw new Error(
      "GitHub App private key not configured. Set FACTORY_APP_PRIVATE_KEY_CONTENT (cloud) or FACTORY_APP_PRIVATE_KEY_PATH (local dev)"
    );
  }

  return new GitHubProducerClient({
    appId,
    privateKey,
    installationId: parseInt(installationId, 10),
    webhookSecret: process.env["FACTORY_APP_WEBHOOK_SECRET"],
  });
}
