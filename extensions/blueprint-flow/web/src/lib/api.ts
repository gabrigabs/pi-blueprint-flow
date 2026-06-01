import type {
	ActionRun,
	Artifact,
	BridgeStatus,
	Flow,
	Interview,
	Memory,
	Step,
	Workflow,
	WorkflowStep,
	Workspace,
} from "../store";

export interface CreateWorkspacePayload {
	name: string;
	repoPath?: string;
	description?: string;
	stack?: string[];
}

export interface UpdateWorkspacePayload {
	name?: string;
	description?: string;
	repoPath?: string;
	stack?: string[];
	archived?: boolean;
}

export interface CreateFlowPayload {
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

export interface ImportWorkspacePayload {
	repoPath: string;
	name?: string;
	mode: "analyze_only" | "migrate_with_review";
	agentRunSettings?: AgentRunSettingsPayload;
}

export interface RunActionPayload {
	workspaceId?: string;
	flowId?: string;
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
	workspaceId: string | null;
	workspaceName: string;
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
	workspaces: {
		list: () =>
			request<(Workspace & { flow_count: number })[]>("/api/workspaces"),
		get: (id: string) => request<Workspace>(`/api/workspaces/${id}`),
		create: (data: CreateWorkspacePayload) =>
			request<Workspace>("/api/workspaces", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: UpdateWorkspacePayload) =>
			request<Workspace>(`/api/workspaces/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		import: (data: ImportWorkspacePayload) =>
			request<ImportResult>("/api/workspaces/import", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			fetch(`/api/workspaces/${id}`, { method: "DELETE" }).then((res) => {
				if (!res.ok) throw new Error("Failed to delete workspace");
			}),
	},

	flows: {
		list: (workspaceId: string) =>
			request<Flow[]>(`/api/workspaces/${workspaceId}/flows`),
		listRecent: (limit = 8) =>
			request<(Flow & { workspace_name: string })[]>(
				`/api/flows/recent?limit=${limit}`,
			),
		get: (id: string) => request<Flow>(`/api/flows/${id}`),
		create: (workspaceId: string, data: CreateFlowPayload) =>
			request<Flow>(`/api/workspaces/${workspaceId}/flows`, {
				method: "POST",
				body: JSON.stringify(data),
			}),
		update: (id: string, data: Partial<CreateFlowPayload>) =>
			request<Flow>(`/api/flows/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			fetch(`/api/flows/${id}`, { method: "DELETE" }).then((res) => {
				if (!res.ok) throw new Error("Failed to delete flow");
			}),
		advance: (id: string) =>
			request<{ flow: Flow; steps: Step[]; completed: boolean }>(
				`/api/flows/${id}/advance`,
				{ method: "POST", body: JSON.stringify({}) },
			),
		back: (id: string) =>
			request<{ flow: Flow; steps: Step[] }>(`/api/flows/${id}/back`, {
				method: "POST",
				body: JSON.stringify({}),
			}),
		focusStep: (id: string, stepName: string) =>
			request<{ flow: Flow; steps: Step[] }>(`/api/flows/${id}/focus-step`, {
				method: "POST",
				body: JSON.stringify({ stepName }),
			}),
		runStep: (id: string, agentRunSettings?: AgentRunSettingsPayload) =>
			request(`/api/flows/${id}/run-step`, {
				method: "POST",
				body: JSON.stringify({ agentRunSettings }),
			}),
		runAction: (
			id: string,
			actionType: string,
			agentRunSettings?: AgentRunSettingsPayload,
		) =>
			request<{
				flowId: string;
				actionType: string;
				actionRunId: string;
				actionStatus: string;
			}>(`/api/flows/${id}/run-action`, {
				method: "POST",
				body: JSON.stringify({ actionType, agentRunSettings }),
			}),
	},

	steps: {
		list: (flowId: string) => request<Step[]>(`/api/flows/${flowId}/steps`),
		updateStatus: (id: string, status: string) =>
			request<Step>(`/api/steps/${id}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			}),
	},

	artifacts: {
		list: (flowId: string) =>
			request<Artifact[]>(`/api/flows/${flowId}/artifacts`),
		get: (id: string) => request<Artifact>(`/api/artifacts/${id}`),
		create: (data: {
			flowId: string;
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
		list: (flowId: string) =>
			request<Interview[]>(`/api/flows/${flowId}/interviews`),
		pending: (flowId: string) =>
			request<Interview[]>(`/api/flows/${flowId}/interviews/pending`),
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
		list: (workspaceId: string) =>
			request<Memory[]>(`/api/workspaces/${workspaceId}/memories`),
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
			flowId?: string;
			workspaceId?: string;
			status?: string;
			limit?: number;
		}) => {
			const params = new URLSearchParams();
			if (filters?.flowId) params.set("flowId", filters.flowId);
			if (filters?.workspaceId) params.set("workspaceId", filters.workspaceId);
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
		forceCancel: (id: string) =>
			request<{ success: boolean; status: string }>(
				`/api/action-runs/${id}/force-cancel`,
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
		list: (workspaceId?: string) => {
			const qs = workspaceId ? `?workspaceId=${workspaceId}` : "";
			return request<Workflow[]>(`/api/workflows${qs}`);
		},
		get: (id: string) => request<Workflow>(`/api/workflows/${id}`),
		getWorkspaceWorkflow: (workspaceId: string) =>
			request<Workflow>(`/api/workspaces/${workspaceId}/workflow`),
		create: (data: {
			workspaceId?: string;
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
		assignToWorkspace: (workspaceId: string, workflowId: string) =>
			request<{ success: boolean; workflowId: string }>(
				`/api/workspaces/${workspaceId}/workflow`,
				{
					method: "POST",
					body: JSON.stringify({ workflowId }),
				},
			),
	},
};
