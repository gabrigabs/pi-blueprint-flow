export const FEATURE_TYPES = [
  "feature",
  "bugfix",
  "refactor",
  "spike",
  "research",
  "maintenance",
] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];

export const RISK_LEVELS = ["low", "medium", "high", "auto"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const PRIORITY_LEVELS = ["low", "medium", "high"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const EFFORT_LEVELS = ["fast", "balanced", "deep", "max"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const EXECUTION_MODES = ["draft", "review", "apply"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const REVIEW_STRICTNESS = ["light", "normal", "strict"] as const;
export type ReviewStrictness = (typeof REVIEW_STRICTNESS)[number];

export const IMPORT_MODES = ["analyze_only", "migrate_with_review"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export interface AgentRunSettings {
  modelId?: string;
  agentProfile?: string;
  effortLevel: EffortLevel;
  executionMode: ExecutionMode;
  allowWebResearch: boolean;
  allowRepoScan: boolean;
  allowMemorySearch: boolean;
  maxResearchResults?: number;
  maxInterviewQuestions?: number;
  reviewStrictness: ReviewStrictness;
}

export const EFFORT_DEFAULTS: Record<EffortLevel, Partial<AgentRunSettings>> = {
  fast: {
    maxResearchResults: 3,
    maxInterviewQuestions: 2,
    reviewStrictness: "light",
  },
  balanced: {
    maxResearchResults: 5,
    maxInterviewQuestions: 5,
    reviewStrictness: "normal",
  },
  deep: {
    maxResearchResults: 10,
    maxInterviewQuestions: 8,
    reviewStrictness: "strict",
  },
  max: {
    maxResearchResults: 15,
    maxInterviewQuestions: 12,
    reviewStrictness: "strict",
    executionMode: "review",
  },
};

export function buildRunSettings(partial: Partial<AgentRunSettings> = {}): AgentRunSettings {
  const effort = partial.effortLevel ?? "balanced";
  const defaults = EFFORT_DEFAULTS[effort];

  return {
    effortLevel: effort,
    executionMode: partial.executionMode ?? (defaults.executionMode as ExecutionMode) ?? "draft",
    allowWebResearch: partial.allowWebResearch ?? true,
    allowRepoScan: partial.allowRepoScan ?? true,
    allowMemorySearch: partial.allowMemorySearch ?? true,
    maxResearchResults: partial.maxResearchResults ?? defaults.maxResearchResults,
    maxInterviewQuestions: partial.maxInterviewQuestions ?? defaults.maxInterviewQuestions,
    reviewStrictness: partial.reviewStrictness ?? (defaults.reviewStrictness as ReviewStrictness) ?? "normal",
    modelId: partial.modelId,
    agentProfile: partial.agentProfile,
  };
}

export interface CreateProjectInput {
  name: string;
  repoPath?: string;
  description?: string;
  stack?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  repoPath?: string;
  stack?: string[];
  archived?: boolean;
}

export interface CreateFeatureInput {
  projectId: string;
  title: string;
  description?: string;
  type?: FeatureType;
  riskLevel?: RiskLevel;
  priority?: PriorityLevel;
  agentRunSettings?: Partial<AgentRunSettings>;
}

export interface UpdateFeatureInput {
  title?: string;
  description?: string;
  type?: FeatureType;
  riskLevel?: RiskLevel;
  priority?: PriorityLevel;
}

export interface ImportProjectInput {
  repoPath: string;
  name?: string;
  mode: ImportMode;
  agentRunSettings?: Partial<AgentRunSettings>;
}

export interface CreateArtifactInput {
  featureId: string;
  stepName: string;
  type: string;
  filename: string;
  content: string;
}

export interface UpdateArtifactInput {
  content?: string;
  filename?: string;
}
