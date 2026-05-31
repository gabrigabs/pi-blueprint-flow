export const FLOW_TYPES = [
	"feature",
	"bugfix",
	"refactor",
	"spike",
	"research",
	"maintenance",
] as const;

export type FlowType = (typeof FLOW_TYPES)[number];

/** @deprecated Use FlowType */
export type FeatureType = FlowType;
/** @deprecated Use FLOW_TYPES */
export const FEATURE_TYPES = FLOW_TYPES;

export const RISK_LEVELS = ["low", "medium", "high", "auto"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const PRIORITY_LEVELS = ["low", "medium", "high"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const EFFORT_LEVELS = ["fast", "balanced", "deep", "max"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const EXECUTION_MODES = [
	"draft",
	"review",
	"apply",
	"subagent",
] as const;
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

export function buildRunSettings(
	partial: Partial<AgentRunSettings> = {},
): AgentRunSettings {
	const effort = partial.effortLevel ?? "balanced";
	const defaults = EFFORT_DEFAULTS[effort];

	return {
		effortLevel: effort,
		executionMode:
			partial.executionMode ??
			(defaults.executionMode as ExecutionMode) ??
			"draft",
		allowWebResearch: partial.allowWebResearch ?? true,
		allowRepoScan: partial.allowRepoScan ?? true,
		allowMemorySearch: partial.allowMemorySearch ?? true,
		maxResearchResults:
			partial.maxResearchResults ?? defaults.maxResearchResults,
		maxInterviewQuestions:
			partial.maxInterviewQuestions ?? defaults.maxInterviewQuestions,
		reviewStrictness:
			partial.reviewStrictness ??
			(defaults.reviewStrictness as ReviewStrictness) ??
			"normal",
		modelId: partial.modelId,
		agentProfile: partial.agentProfile,
	};
}

export interface CreateWorkspaceInput {
	name: string;
	repoPath?: string;
	description?: string;
	stack?: string[];
}

export interface UpdateWorkspaceInput {
	name?: string;
	description?: string;
	repoPath?: string;
	stack?: string[];
	archived?: boolean;
}

export interface CreateFlowInput {
	workspaceId: string;
	title: string;
	description?: string;
	type?: FlowType;
	riskLevel?: RiskLevel;
	priority?: PriorityLevel;
	agentRunSettings?: Partial<AgentRunSettings>;
}

export interface UpdateFlowInput {
	title?: string;
	description?: string;
	type?: FlowType;
	riskLevel?: RiskLevel;
	priority?: PriorityLevel;
}

export interface ImportWorkspaceInput {
	repoPath: string;
	name?: string;
	mode: ImportMode;
	agentRunSettings?: Partial<AgentRunSettings>;
}

export interface CreateArtifactInput {
	flowId: string;
	stepName: string;
	type: string;
	filename: string;
	content: string;
}

export interface UpdateArtifactInput {
	content?: string;
	filename?: string;
}

// --- Step Types ---

export const STEP_TYPES = ["agent", "manual", "hybrid"] as const;
export type StepType = (typeof STEP_TYPES)[number];

/** @deprecated Use CreateWorkspaceInput */
export type CreateProjectInput = CreateWorkspaceInput;
/** @deprecated Use UpdateWorkspaceInput */
export type UpdateProjectInput = UpdateWorkspaceInput;
/** @deprecated Use CreateFlowInput */
export type CreateFeatureInput = CreateFlowInput;
/** @deprecated Use UpdateFlowInput */
export type UpdateFeatureInput = UpdateFlowInput;
/** @deprecated Use ImportWorkspaceInput */
export type ImportProjectInput = ImportWorkspaceInput;

// --- Action Run Types ---

export const ACTION_RUN_STATUSES = [
	"created",
	"queued",
	"waiting_for_pi",
	"injected",
	"agent_running",
	"tool_running",
	"needs_user",
	"saving_artifacts",
	"completed",
	"failed",
	"cancelled",
	"not_connected",
] as const;

export type ActionRunStatus = (typeof ACTION_RUN_STATUSES)[number];

export const ACTION_TYPES = [
	"run_step",
	"research",
	"interview",
	"spec",
	"ddd",
	"behavior",
	"implementation_plan",
	"implementation",
	"review",
	"memory_update",
	"import_project_agent_analysis",
	"generate",
	"analyze",
	"summarize",
	"custom",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface ActionRun {
	id: string;
	workspace_id: string | null;
	flow_id: string | null;
	action_type: ActionType;
	step_name: string | null;
	status: ActionRunStatus;
	prompt: string | null;
	model_id: string | null;
	effort_level: string | null;
	execution_mode: string | null;
	error: string | null;
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ActionRunEvent {
	id: string;
	action_run_id: string;
	type: string;
	message: string | null;
	data_json: string | null;
	created_at: string;
}

export const ACTION_EVENT_TYPES = [
	"ui.action.created",
	"ui.action.queued",
	"pi.prompt.injected",
	"pi.agent.start",
	"pi.message.delta",
	"pi.tool.start",
	"pi.tool.update",
	"pi.tool.end",
	"pi.agent.end",
	"blueprint.artifact.saved",
	"blueprint.memory.saved",
	"blueprint.interview.question",
	"blueprint.error",
] as const;

export type ActionEventType = (typeof ACTION_EVENT_TYPES)[number];

export interface RunBlueprintActionInput {
	workspaceId?: string;
	flowId?: string;
	actionType: ActionType;
	stepName?: string;
	modelId?: string;
	thinkingLevel?: string;
	effortLevel?: EffortLevel;
	executionMode?: ExecutionMode;
	allowRepoScan?: boolean;
	allowMemorySearch?: boolean;
	allowWebResearch?: boolean;
	maxResearchResults?: number;
	maxInterviewQuestions?: number;
	reviewStrictness?: ReviewStrictness;
	extraContext?: Record<string, unknown>;
}

export const EFFORT_TO_THINKING: Record<EffortLevel, string> = {
	fast: "low",
	balanced: "medium",
	deep: "high",
	max: "xhigh",
};
