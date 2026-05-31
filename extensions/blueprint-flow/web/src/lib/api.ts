import type {
	ActionRun,
	Artifact,
	BridgeStatus,
	Feature,
	Interview,
	Memory,
	Project,
	Step,
	Workflow,
	WorkflowStep,
} from "../store";

export interface CreateProjectPayload {
	name: string;
	repoPath?: string;
	description?: string;
	stack?: string[];
}

export interface UpdateProjectPayload {
	name?: string;
	description?: string;
	repoPath?: string;
	stack?: string[];
	archived?: boolean;
}

export interface CreateFeaturePayload {
	title: string;
	description?: string;
	type?: string;
	riskLevel?: string;
	priority?: string;
	agentRunSettings?: AgentRunSettingsPayload;
}

export interface AgentRunSettingsPayload {
	modelId?: string;
	agentProfile?: string;
	thinkingLevel?: string;
	effortLevel?: string;
	executionMode?: string;
	allowWebResearch?: boolean;
	allowRepoScan?: boolean;
	allowMemorySearch?: boolean;
	maxResearchResults?: number;
	maxInterviewQuestions?: number;
	reviewStrictness?: string;
}

export interface ImportProjectPayload {
	repoPath: string;
	name?: string;
	mode: "analyze_only" | "migrate_with_review";
	agentRunSettings?: AgentRunSettingsPayload;
}

export interface RunActionPayload {
	projectId?: string;
	featureId?: string;
	actionType: string;
	stepName?: string;
	modelId?: string;
	thinkingLevel?: string;
	effortLevel?: string;
	executionMode?: string;
	allowRepoScan?: boolean;
	allowMemorySearch?: boolean;
	allowWebResearch?: boolean;
	maxResearchResults?: number;
	maxInterviewQuestions?: number;
	reviewStrictness?: string;
	extraContext?: Record<string, unknown>;
}

export interface AgentModelInfo {
	id: string;
	name: string;
	provider: string;
	reasoning: boolean;
	contextWindow: number;
	maxTokens: number;
	cost: { input: number; output: number };
	supportedThinkingLevels: string[];
}

export type ThinkingLevel =
	| "off"
	| "minimal"
	| "low"
	| "medium"
	| "high"
	| "xhigh";

export interface AgentConfigResponse {
	defaultProvider: string | null;
	defaultModel: string | null;
	defaultThinkingLevel: ThinkingLevel;
	thinkingLevels: ThinkingLevel[];
	models: AgentModelInfo[];
	currentThinkingLevel: ThinkingLevel | null;
}

export interface ImportResult {
	reportId: string;
	projectId: string | null;
	projectName: string;
	mode: string;
	repoPath: string;
	stack: {
		languages: string[];
		frameworks: string[];
		buildTools: string[];
		testFrameworks: string[];
		packageManagers: string[];
	};
	scripts: string[];
	structure: { totalFiles: number; directories: number; truncated: boolean };
	agenticFiles: {
		relativePath: string;
		type: string;
		size: number;
		rulesCount: number;
		rules: string[];
	}[];
	projectProfile: string;
}

export function mapExecutionMode(frontendMode?: string): string | undefined {
	if (!frontendMode) return undefined;
	if (frontendMode === "draft") return "draft";
	return "apply";
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		headers: { "Content-Type": "application/json" },
		...options,
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ message: res.statusText }));
		throw new Error(body.message || `Request failed: ${res.status}`);
	}

	return res.json();
}

export const api = {
	projects: {
		list: () =>
			request<(Project & { feature_count: number })[]>("/api/projects"),
		get: (id: string) => request<Project>(`/api/projects/${id}`),
		create: (data: CreateProjectPayload) =>
			request<Project>("/api/projects", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: UpdateProjectPayload) =>
			request<Project>(`/api/projects/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		import: (data: ImportProjectPayload) =>
			request<ImportResult>("/api/projects/import", {
				method: "POST",
				body: JSON.stringify(data),
			}),
	},

	features: {
		list: (projectId: string) =>
			request<Feature[]>(`/api/projects/${projectId}/features`),
		get: (id: string) => request<Feature>(`/api/features/${id}`),
		create: (projectId: string, data: CreateFeaturePayload) =>
			request<Feature>(`/api/projects/${projectId}/features`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Partial<CreateFeaturePayload>) =>
			request<Feature>(`/api/features/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		advance: (id: string) =>
			request<{ feature: Feature; steps: Step[]; completed: boolean }>(
				`/api/features/${id}/advance`,
				{ method: "POST", body: JSON.stringify({}) },
			),
		back: (id: string) =>
			request<{ feature: Feature; steps: Step[] }>(`/api/features/${id}/back`, {
				method: "POST",
				body: JSON.stringify({}),
			}),
		focusStep: (id: string, stepName: string) =>
			request<{ feature: Feature; steps: Step[] }>(
				`/api/features/${id}/focus-step`,
				{
					method: "POST",
					body: JSON.stringify({ stepName }),
				},
			),
		runStep: (id: string, agentRunSettings?: AgentRunSettingsPayload) =>
			request(`/api/features/${id}/run-step`, {
				method: "POST",
				body: JSON.stringify({ agentRunSettings }),
			}),
		runAction: (
			id: string,
			actionType: string,
			agentRunSettings?: AgentRunSettingsPayload,
		) =>
			request<{
				featureId: string;
				actionType: string;
				actionRunId: string;
				actionStatus: string;
			}>(`/api/features/${id}/run-action`, {
				method: "POST",
				body: JSON.stringify({ actionType, agentRunSettings }),
			}),
	},

	steps: {
		list: (featureId: string) =>
			request<Step[]>(`/api/features/${featureId}/steps`),
		updateStatus: (id: string, status: string) =>
			request<Step>(`/api/steps/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			}),
	},

	artifacts: {
		list: (featureId: string) =>
			request<Artifact[]>(`/api/features/${featureId}/artifacts`),
		get: (id: string) => request<Artifact>(`/api/artifacts/${id}`),
		create: (data: {
			featureId: string;
			stepName: string;
			type: string;
			filename: string;
			content: string;
		}) =>
			request<Artifact>("/api/artifacts", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: { content?: string; filename?: string }) =>
			request<Artifact>(`/api/artifacts/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
	},

	interviews: {
		list: (featureId: string) =>
			request<Interview[]>(`/api/features/${featureId}/interviews`),
		pending: (featureId: string) =>
			request<Interview[]>(`/api/features/${featureId}/interviews/pending`),
		answer: (id: string, answer: string) =>
			request<Interview>(`/api/interviews/${id}/answer`, {
				method: "POST",
				body: JSON.stringify({ answer }),
			}),
		skip: (id: string, reason?: string) =>
			request<Interview>(`/api/interviews/${id}/skip`, {
				method: "POST",
				body: JSON.stringify({ reason }),
			}),
	},

	memories: {
		list: (projectId: string) =>
			request<Memory[]>(`/api/projects/${projectId}/memories`),
	},

	config: {
		agent: () => request<AgentConfigResponse>("/api/config/agent"),
		setThinkingLevel: (level: ThinkingLevel) =>
			request<{ success: boolean; level: ThinkingLevel }>(
				"/api/config/thinking-level",
				{
					method: "POST",
					body: JSON.stringify({ level }),
				},
			),
		setModel: (modelId: string, provider?: string) =>
			request<{
				success: boolean;
				model: { id: string; name: string; provider: string };
			}>("/api/config/model", {
				method: "POST",
				body: JSON.stringify({ modelId, provider }),
			}),
	},

	actionRuns: {
		list: (filters?: {
			featureId?: string;
			projectId?: string;
			status?: string;
			limit?: number;
		}) => {
			const params = new URLSearchParams();
			if (filters?.featureId) params.set("featureId", filters.featureId);
			if (filters?.projectId) params.set("projectId", filters.projectId);
			if (filters?.status) params.set("status", filters.status);
			if (filters?.limit) params.set("limit", String(filters.limit));
			const qs = params.toString();
			return request<ActionRun[]>(`/api/action-runs${qs ? `?${qs}` : ""}`);
		},
		get: (id: string) => request<ActionRun>(`/api/action-runs/${id}`),
		getEvents: (id: string) =>
			request<
				Array<{
					id: string;
					action_run_id: string;
					type: string;
					message: string | null;
					data_json: string | null;
					created_at: string;
				}>
			>(`/api/action-runs/${id}/events`),
		create: (data: RunActionPayload) =>
			request<{ actionRunId: string; status: string }>("/api/action-runs", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		cancel: (id: string) =>
			request<{ success: boolean; status: string }>(
				`/api/action-runs/${id}/cancel`,
				{
					method: "POST",
				},
			),
		inject: (id: string, message: string) =>
			request<{ success: boolean }>(`/api/action-runs/${id}/inject`, {
				method: "POST",
				body: JSON.stringify({ message }),
			}),
		retry: (id: string, feedback?: string) =>
			request<{ actionRunId: string; status: string }>(
				`/api/action-runs/${id}/retry`,
				{
					method: "POST",
					body: JSON.stringify({ feedback }),
				},
			),
	},

	bridge: {
		status: () => request<{ status: BridgeStatus }>("/api/bridge/status"),
	},

	workflows: {
		list: (projectId?: string) => {
			const qs = projectId ? `?projectId=${projectId}` : "";
			return request<Workflow[]>(`/api/workflows${qs}`);
		},
		get: (id: string) => request<Workflow>(`/api/workflows/${id}`),
		getProjectWorkflow: (projectId: string) =>
			request<Workflow>(`/api/projects/${projectId}/workflow`),
		create: (data: {
			projectId?: string;
			name: string;
			description?: string;
			steps: WorkflowStep[];
		}) =>
			request<Workflow>("/api/workflows", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (
			id: string,
			data: { name?: string; description?: string; steps?: WorkflowStep[] },
		) =>
			request<Workflow>(`/api/workflows/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ success: boolean }>(`/api/workflows/${id}`, {
				method: "DELETE",
			}),
		assignToProject: (projectId: string, workflowId: string) =>
			request<{ success: boolean; workflowId: string }>(
				`/api/projects/${projectId}/workflow`,
				{
					method: "POST",
					body: JSON.stringify({ workflowId }),
				},
			),
	},
};
