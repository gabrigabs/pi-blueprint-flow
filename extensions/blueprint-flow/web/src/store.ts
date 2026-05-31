import { create } from "zustand";

export interface Workspace {
	id: string;
	name: string;
	description: string | null;
	repo_path: string | null;
	stack: string;
	archived: number;
	flow_count?: number;
	created_at: string;
	updated_at: string;
}

export interface Flow {
	id: string;
	workspace_id: string;
	title: string;
	description: string | null;
	type: string;
	risk_level: string;
	priority: string;
	current_step: string;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface Step {
	id: string;
	flow_id: string;
	name: string;
	status: string;
	started_at: string | null;
	completed_at: string | null;
}

export interface Artifact {
	id: string;
	flow_id: string;
	step_name: string;
	type: string;
	filename: string;
	content?: string;
	created_at: string;
}

export interface Memory {
	id: string;
	workspace_id: string;
	category: string;
	content: string;
	source_flow_id: string | null;
	created_at: string;
}

export interface Interview {
	id: string;
	flow_id: string;
	question: string;
	answer: string | null;
	type: string;
	required: number;
	response_type: string;
	options: string[] | null;
	why: string | null;
	created_at: string;
}

export interface ActionRun {
	id: string;
	workspace_id: string | null;
	flow_id: string | null;
	action_type: string;
	step_name: string | null;
	status: string;
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

/** @deprecated Use Workspace */
export type Project = Workspace;
/** @deprecated Use Flow */
export type Feature = Flow;

export type BridgeStatus = "idle" | "busy" | "not_connected";

export type StepType = "agent" | "manual" | "hybrid";

export interface WorkflowStep {
	name: string;
	label: string;
	actionType?: string;
	type?: StepType;
	optional?: boolean;
	modelId?: string;
	thinkingLevel?: string;
}

export interface Workflow {
	id: string;
	workspace_id: string | null;
	name: string;
	description: string | null;
	steps_json: string;
	steps: WorkflowStep[];
	is_default: number;
	created_at: string;
	updated_at: string;
}

export type ConnectionState = "connected" | "reconnecting" | "disconnected";

export type ModalType =
	| "create_workspace"
	| "create_flow"
	| "agent_settings"
	| "workflow_editor"
	| "knowledge"
	| null;

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationEntry {
	id: string;
	type: NotificationType;
	message: string;
	timestamp: number;
	stepName?: string;
	actionRunId?: string;
}

interface BlueprintStore {
	workspaces: Workspace[];
	flows: Flow[];
	steps: Step[];
	artifacts: Artifact[];
	memories: Memory[];
	interviews: Interview[];
	actionRuns: ActionRun[];
	workflows: Workflow[];
	activeWorkflow: Workflow | null;
	bridgeStatus: BridgeStatus;
	selectedWorkspaceId: string | null;
	selectedFlowId: string | null;
	selectedArtifactId: string | null;
	selectedNodeId: string | null;
	connected: boolean;
	connectionState: ConnectionState;
	activeModal: ModalType;

	// Panel visibility
	sidebarCollapsed: boolean;
	footerCollapsed: boolean;

	// Content versioning (for real-time updates)
	artifactContentVersion: number;

	// Live activity (streaming from Pi agent)
	liveActionRunId: string | null;
	liveToolName: string | null;
	liveMessagePreview: string | null;
	liveToolHistory: { name: string; startedAt: number; endedAt?: number }[];
	lastRunToolHistory: { name: string; startedAt: number; endedAt?: number }[];
	actionTimeout: { timeoutMs: number; startedAt: number } | null;

	// Notifications
	notifications: NotificationEntry[];
	unreadNotificationCount: number;

	// Execution mode
	executionMode: "supervised" | "autonomous" | "draft";

	// Run settings (shared between drawer and canvas node actions)
	runModelId: string | null;
	runThinkingLevel: string;

	// Canvas edit mode
	canvasEditMode: boolean;
	editModeSteps: WorkflowStep[] | null;

	setWorkspaces: (workspaces: Workspace[]) => void;
	setFlows: (flows: Flow[]) => void;
	setSteps: (steps: Step[]) => void;
	setArtifacts: (artifacts: Artifact[]) => void;
	setMemories: (memories: Memory[]) => void;
	setInterviews: (interviews: Interview[]) => void;
	setActionRuns: (runs: ActionRun[]) => void;
	updateActionRun: (id: string, updates: Partial<ActionRun>) => void;
	addActionRun: (run: ActionRun) => void;
	setWorkflows: (workflows: Workflow[]) => void;
	setActiveWorkflow: (workflow: Workflow | null) => void;
	setBridgeStatus: (status: BridgeStatus) => void;
	selectWorkspace: (id: string | null) => void;
	selectFlow: (id: string | null) => void;
	selectArtifact: (id: string | null) => void;
	selectNode: (id: string | null) => void;
	setConnected: (connected: boolean) => void;
	setConnectionState: (state: ConnectionState) => void;
	toggleSidebar: () => void;
	toggleFooter: () => void;
	incrementArtifactVersion: () => void;
	openModal: (modal: ModalType) => void;
	closeModal: () => void;

	// Execution mode
	setExecutionMode: (mode: "supervised" | "autonomous" | "draft") => void;

	// Run settings
	setRunModelId: (modelId: string | null) => void;
	setRunThinkingLevel: (level: string) => void;

	// Canvas edit mode actions
	setCanvasEditMode: (editing: boolean) => void;
	setEditModeSteps: (steps: WorkflowStep[] | null) => void;
	addEditStep: (index: number, step: WorkflowStep) => void;
	removeEditStep: (index: number) => void;
	updateEditStep: (index: number, updates: Partial<WorkflowStep>) => void;
	reorderEditStep: (fromIndex: number, toIndex: number) => void;

	// Live activity setters
	setLiveActivity: (
		actionRunId: string | null,
		toolName: string | null,
	) => void;
	setActionTimeout: (
		timeout: { timeoutMs: number; startedAt: number } | null,
	) => void;
	appendLiveMessage: (text: string) => void;
	clearLiveActivity: () => void;
	pushLiveToolEnd: () => void;

	// Notification actions
	addNotification: (entry: Omit<NotificationEntry, "id" | "timestamp">) => void;
	clearNotifications: () => void;
	markNotificationsRead: () => void;
}

export const useStore = create<BlueprintStore>((set) => ({
	workspaces: [],
	flows: [],
	steps: [],
	artifacts: [],
	memories: [],
	interviews: [],
	actionRuns: [],
	workflows: [],
	activeWorkflow: null,
	bridgeStatus: "not_connected",
	selectedWorkspaceId: null,
	selectedFlowId: null,
	selectedArtifactId: null,
	selectedNodeId: null,
	connected: false,
	connectionState: "disconnected" as ConnectionState,
	activeModal: null,

	sidebarCollapsed: false,
	footerCollapsed: false,
	artifactContentVersion: 0,

	liveActionRunId: null,
	liveToolName: null,
	liveMessagePreview: null,
	liveToolHistory: [],
	lastRunToolHistory: [],
	actionTimeout: null,

	notifications: [],
	unreadNotificationCount: 0,

	executionMode: "supervised",

	runModelId: null,
	runThinkingLevel: "medium",

	canvasEditMode: false,
	editModeSteps: null,

	setWorkspaces: (workspaces) => set({ workspaces }),
	setFlows: (flows) => set({ flows }),
	setSteps: (steps) => set({ steps }),
	setArtifacts: (artifacts) => set({ artifacts }),
	setMemories: (memories) => set({ memories }),
	setInterviews: (interviews) => set({ interviews }),
	setActionRuns: (actionRuns) => set({ actionRuns }),
	updateActionRun: (id, updates) =>
		set((state) => ({
			actionRuns: state.actionRuns.map((r) =>
				r.id === id ? { ...r, ...updates } : r,
			),
		})),
	addActionRun: (run) =>
		set((state) => ({ actionRuns: [run, ...state.actionRuns] })),
	setWorkflows: (workflows) => set({ workflows }),
	setActiveWorkflow: (activeWorkflow) => set({ activeWorkflow }),
	setBridgeStatus: (bridgeStatus) => set({ bridgeStatus }),
	selectWorkspace: (id) =>
		set({
			selectedWorkspaceId: id,
			selectedFlowId: null,
			selectedArtifactId: null,
		}),
	selectFlow: (id) =>
		set({
			selectedFlowId: id,
			selectedArtifactId: null,
			selectedNodeId: null,
		}),
	selectArtifact: (id) => set({ selectedArtifactId: id }),
	selectNode: (id) => set({ selectedNodeId: id }),
	setConnected: (connected) => set({ connected }),
	setConnectionState: (connectionState) => set({ connectionState }),
	toggleSidebar: () =>
		set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
	toggleFooter: () =>
		set((state) => ({ footerCollapsed: !state.footerCollapsed })),
	incrementArtifactVersion: () =>
		set((state) => ({
			artifactContentVersion: state.artifactContentVersion + 1,
		})),
	openModal: (modal) => set({ activeModal: modal }),
	closeModal: () => set({ activeModal: null }),

	setExecutionMode: (mode) => set({ executionMode: mode }),

	setRunModelId: (modelId) => set({ runModelId: modelId }),
	setRunThinkingLevel: (level) => set({ runThinkingLevel: level }),

	setCanvasEditMode: (editing) => set({ canvasEditMode: editing }),
	setEditModeSteps: (steps) => set({ editModeSteps: steps }),
	addEditStep: (index, step) =>
		set((state) => {
			if (!state.editModeSteps) return {};
			const steps = [...state.editModeSteps];
			steps.splice(index, 0, step);
			return { editModeSteps: steps };
		}),
	removeEditStep: (index) =>
		set((state) => {
			if (!state.editModeSteps) return {};
			const steps = state.editModeSteps.filter((_, i) => i !== index);
			return { editModeSteps: steps };
		}),
	updateEditStep: (index, updates) =>
		set((state) => {
			if (!state.editModeSteps) return {};
			const steps = state.editModeSteps.map((s, i) =>
				i === index ? { ...s, ...updates } : s,
			);
			return { editModeSteps: steps };
		}),
	reorderEditStep: (fromIndex, toIndex) =>
		set((state) => {
			if (!state.editModeSteps) return {};
			const steps = [...state.editModeSteps];
			const [moved] = steps.splice(fromIndex, 1);
			steps.splice(toIndex, 0, moved);
			return { editModeSteps: steps };
		}),

	setLiveActivity: (actionRunId, toolName) =>
		set((state) => ({
			liveActionRunId: actionRunId,
			liveToolName: toolName,
			liveToolHistory: toolName
				? [...state.liveToolHistory, { name: toolName, startedAt: Date.now() }]
				: state.liveToolHistory,
		})),
	appendLiveMessage: (text) =>
		set((state) => ({
			liveMessagePreview: (state.liveMessagePreview ?? "") + text,
		})),
	clearLiveActivity: () =>
		set((state) => ({
			liveActionRunId: null,
			liveToolName: null,
			liveMessagePreview: null,
			lastRunToolHistory:
				state.liveToolHistory.length > 0
					? state.liveToolHistory
					: state.lastRunToolHistory,
			liveToolHistory: [],
			actionTimeout: null,
		})),
	setActionTimeout: (timeout) => set({ actionTimeout: timeout }),
	pushLiveToolEnd: () =>
		set((state) => {
			const history = [...state.liveToolHistory];
			const last = history[history.length - 1];
			if (last && !last.endedAt) last.endedAt = Date.now();
			return { liveToolHistory: history, liveToolName: null };
		}),

	addNotification: (entry) =>
		set((state) => {
			const notification: NotificationEntry = {
				...entry,
				id: crypto.randomUUID(),
				timestamp: Date.now(),
			};
			const notifications = [notification, ...state.notifications].slice(0, 50);
			return {
				notifications,
				unreadNotificationCount: state.unreadNotificationCount + 1,
			};
		}),
	clearNotifications: () =>
		set({ notifications: [], unreadNotificationCount: 0 }),
	markNotificationsRead: () => set({ unreadNotificationCount: 0 }),
}));
