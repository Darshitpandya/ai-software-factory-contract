// Contract types — derived from JSON schemas in contracts/schemas/
// These are the authoritative TypeScript interfaces for all factory records.

export type WorkOrderStatus =
  | "PENDING"
  | "RUNNING"
  | "BLOCKED"
  | "COMPLETED"
  | "FAILED"
  | "WAITING_FOR_HUMAN";

export type FactoryStage =
  | "product-requirements"
  | "software-architecture"
  | "software-engineering"
  | "security-compliance"
  | "platform-operations";

export type StageStatus =
  | "PENDING"
  | "RUNNING"
  | "PRODUCED"
  | "ACCEPTED"
  | "REJECTED"
  | "BLOCKED"
  | "SKIPPED";

export type FactoryRunStatus =
  | "PENDING"
  | "RUNNING"
  | "BLOCKED"
  | "WAITING_FOR_HUMAN"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type FactoryReleaseStatus =
  | "CANDIDATE"
  | "ACTIVE"
  | "DEPRECATED"
  | "REJECTED";

export type PromotionDecisionValue = "PROMOTE" | "HOLD" | "REJECT";

export interface WorkOrder {
  id: string;
  version: number;
  title: string;
  targetService: string;
  scope: string;
  factoryRelease: string;
  requestedBy: string;
  createdAt: string;
  constraints?: Record<string, unknown>;
  portRunId?: string;
  githubOrg?: string;
  status: WorkOrderStatus;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
}

export interface StageRecord {
  status: StageStatus;
  attempts: number;
  startedAt?: string;
  completedAt?: string;
  artifactRef?: string;
  acceptanceRef?: string;
  modelUsed?: string;
  tokenUsage?: TokenUsage;
  error?: string;
}

export interface FactoryRun {
  id: string;
  workOrderId: string;
  factoryRelease: string;
  status: FactoryRunStatus;
  currentStage?: FactoryStage;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  githubRunUrl?: string;
  evidenceRef?: string;
  totalDurationSeconds?: number;
  stages: Partial<Record<FactoryStage, StageRecord>>;
  error?: { stage: string; message: string; code: string };
}

export interface ArtifactFile {
  path: string;
  sha256: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface StageArtifact {
  id: string;
  runId: string;
  stage: FactoryStage;
  producedAt: string;
  files: ArtifactFile[];
  sha256: string;
  producerStatus: "PRODUCED";
  modelUsed?: string;
  factoryRelease: string;
  baseRepoSha?: string;
  sandboxId?: string;
  tokenUsage?: TokenUsage;
}

export interface StageDecisionFinding {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  path?: string;
}

export interface StageDecision {
  id: string;
  runId: string;
  stage: string;
  artifactId: string;
  decision: "ACCEPTED" | "REJECTED" | "WAITING_FOR_HUMAN";
  decidedAt: string;
  decidedBy: string;
  evidenceRef: string;
  checkName?: string;
  checkSha?: string;
  findings?: StageDecisionFinding[];
  humanApproval?: {
    approvedBy: string;
    approvedAt: string;
    portActionRunId?: string;
  };
}

export interface PromotionDecision {
  id: string;
  comparisonId: string;
  baseVersion: string;
  candidateVersion: string;
  decision: PromotionDecisionValue;
  authorizedBy: string;
  decidedAt: string;
  allHardGatesPassed: boolean;
  rationale?: string;
  evaluationSummary: {
    baseScore: number;
    candidateScore: number;
    regressions: string[];
    improvements: string[];
    costPerWorkOrder?: { base: number; candidate: number };
  };
}

export interface FactoryReleaseConfig {
  apiVersion: "factory.contract/v1";
  kind: "FactoryRelease";
  metadata: {
    name: string;
    version: string;
    status: FactoryReleaseStatus;
    createdAt?: string;
  };
  runtime: {
    engine: "claude-agent-sdk";
    defaultModel: string;
    sandbox: {
      provider: string;
      imageDigest: string;
      resourceLimits?: {
        cpus?: string;
        memoryMb?: number;
        ttlSeconds?: number;
        networkEgress?: string;
      };
    };
  };
  productionLines: FactoryStage[];
  stageModels?: Partial<Record<FactoryStage, string>>;
  components: {
    skillsLock: string;
    toolsLock: string;
    sandboxLock?: string;
    workflowRef: string;
  };
  acceptance: { contract: string };
  evaluation?: { suite: string; promotionPolicy: string };
  humanApprovalRequired?: Array<{ stage: string; condition: string }>;
}

export interface RepositoryContract {
  apiVersion: "factory.contract/v1";
  kind: "RepositoryContract";
  metadata: {
    name: string;
    owner: string;
    language: string;
    description?: string;
  };
  consumedRelease: string;
  build: {
    install: string;
    typecheck?: string;
    lint?: string;
    test: string;
    e2eTest?: string;
    openApiValidate?: string;
  };
  acceptance: {
    requiredChecks: string[];
    compatibilityBaselinePath?: string;
    tenantIsolationRequired?: boolean;
    piiPolicies?: string[];
  };
  doNotModify?: string[];
}

// Narrowing helpers
export function isFactoryRunTerminal(status: FactoryRunStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function isStageTerminal(status: StageStatus): boolean {
  return (
    status === "ACCEPTED" ||
    status === "REJECTED" ||
    status === "SKIPPED"
  );
}

export const FACTORY_STAGES: FactoryStage[] = [
  "product-requirements",
  "software-architecture",
  "software-engineering",
  "security-compliance",
  "platform-operations",
];

export function nextStage(current: FactoryStage): FactoryStage | null {
  const idx = FACTORY_STAGES.indexOf(current);
  return idx >= 0 && idx < FACTORY_STAGES.length - 1
    ? (FACTORY_STAGES[idx + 1] ?? null)
    : null;
}
