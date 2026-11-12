import type { StageDecision, FactoryStage } from "@factory/contract-types";

// The acceptance client polls for the trusted verifier's decision on a GitHub Check.
// The producer (this code) cannot write the check — only the trusted verifier App can.
// This client is read-only: it waits for the check to appear on GitHub.

export interface AcceptanceWaitOptions {
  owner: string;
  repo: string;
  headSha: string;
  checkName?: string; // defaults to "factory-contract/acceptance"
  pollIntervalMs?: number;
  timeoutMs?: number;
  githubToken: string;
}

export interface CheckRunResult {
  id: number;
  name: string;
  conclusion: "success" | "failure" | "neutral" | "cancelled" | "timed_out" | "action_required" | null;
  status: "queued" | "in_progress" | "completed";
  detailsUrl: string | null;
  output: { summary: string | null };
}

// Wait for the named check to appear as "completed" on the given SHA.
// Returns the check result or throws after timeout.
export async function waitForAcceptanceCheck(
  opts: AcceptanceWaitOptions
): Promise<CheckRunResult> {
  const {
    owner,
    repo,
    headSha,
    checkName = "factory-contract/acceptance",
    pollIntervalMs = 10_000,
    timeoutMs = 30 * 60 * 1000, // 30 min
    githubToken,
  } = opts;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await fetchCheckRun(owner, repo, headSha, checkName, githubToken);

    if (result) {
      if (result.status === "completed") {
        return result;
      }
      // Still in progress — keep polling
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Acceptance check "${checkName}" did not complete within ${timeoutMs / 1000}s for ${owner}/${repo}@${headSha}`
  );
}

async function fetchCheckRun(
  owner: string,
  repo: string,
  headSha: string,
  checkName: string,
  token: string
): Promise<CheckRunResult | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub Checks API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    check_runs: Array<{
      id: number;
      name: string;
      conclusion: CheckRunResult["conclusion"];
      status: CheckRunResult["status"];
      details_url: string | null;
      output: { summary: string | null };
    }>;
  };

  const run = data.check_runs.find((c) => c.name === checkName);
  if (!run) return null;

  return {
    id: run.id,
    name: run.name,
    conclusion: run.conclusion,
    status: run.status,
    detailsUrl: run.details_url,
    output: { summary: run.output.summary },
  };
}

// Convert a GitHub check result to a StageDecision
export function checkResultToDecision(
  runId: string,
  stage: FactoryStage,
  artifactId: string,
  check: CheckRunResult
): StageDecision {
  return {
    id: `${runId}-${stage}-${Date.now()}`,
    runId,
    stage,
    artifactId,
    decision:
      check.conclusion === "success"
        ? "ACCEPTED"
        : check.conclusion === null
        ? "WAITING_FOR_HUMAN"
        : "REJECTED",
    decidedAt: new Date().toISOString(),
    decidedBy: "factory-contract/acceptance (trusted-verifier-app)",
    evidenceRef: check.detailsUrl ?? check.id.toString(),
    checkName: check.name,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
