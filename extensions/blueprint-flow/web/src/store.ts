import { create } from "zustand";

export interface Project {
	id: string;
	name: string;
	description: string | null;
	repo_path: string | null;
	stack: string;
	archived: number;
	feature_count?: number;
	created_at: string;
	updated_at: string;
}

export interface Feature {
	id: string;
	project_id: string;
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
	feature_id: string;
	name: string;
	status: string;
	started_at: string | null;
	completed_at: string | null;
}

export interface Artifact {
	id: string;
	feature_id: string;
	step_name: string;
	type: string;
	filename: string;
	content?: string;
	created_at: string;
}

export interface Memory {
	id: string;
	project_id: string;
	category: string;
	content: string;
	source_feature_id: string | null;
	created_at: string;
}

export interface Interview {
	id: string;
	feature_id: string;
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
	project_id: string | null;
	feature_id: string | null;
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

export type BridgeStatus = "idle" | "busy" | "not_connected";

export interface WorkflowStep {
	name: string;
	label: string;
	actionType?: string;
	optional?: boolean;
	modelId?: string;
	thinkingLevel?: string;
}

export interface Workflow {
	id: string;
	project_id: string | null;
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
	| "onboarding"
	| "create_feature"
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
	projects: Project[];
	features: Feature[];
	steps: Step[];
	artifacts: Artifact[];
	memories: Memory[];
	interviews: Interview[];
	actionRuns: ActionRun[];
	workflows: Workflow[];
	activeWorkflow: Workflow | null;
	bridgeStatus: BridgeStatus;
	selectedProjectId: string | null;
	selectedFeatureId: string | null;
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

	setProjects: (projects: Project[]) => void;
	setFeatures: (features: Feature[]) => void;
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
	selectProject: (id: string | null) => void;
	selectFeature: (id: string | null) => void;
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
	projects: [],
	features: [],
	steps: [],
	artifacts: [],
	memories: [],
	interviews: [],
	actionRuns: [],
	workflows: [],
	activeWorkflow: null,
	bridgeStatus: "not_connected",
	selectedProjectId: null,
	selectedFeatureId: null,
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

	setProjects: (projects) => set({ projects }),
	setFeatures: (features) => set({ features }),
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
	selectProject: (id) =>
		set({
			selectedProjectId: id,
			selectedFeatureId: null,
			selectedArtifactId: null,
		}),
	selectFeature: (id) =>
		set({
			selectedFeatureId: id,
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
