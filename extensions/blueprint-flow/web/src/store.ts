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

export type ModalType =
	| "create_project"
	| "import_project"
	| "create_feature"
	| "agent_settings"
	| null;

interface BlueprintStore {
	projects: Project[];
	features: Feature[];
	steps: Step[];
	artifacts: Artifact[];
	memories: Memory[];
	interviews: Interview[];
	actionRuns: ActionRun[];
	bridgeStatus: BridgeStatus;
	selectedProjectId: string | null;
	selectedFeatureId: string | null;
	selectedArtifactId: string | null;
	connected: boolean;
	activeModal: ModalType;

	setProjects: (projects: Project[]) => void;
	setFeatures: (features: Feature[]) => void;
	setSteps: (steps: Step[]) => void;
	setArtifacts: (artifacts: Artifact[]) => void;
	setMemories: (memories: Memory[]) => void;
	setInterviews: (interviews: Interview[]) => void;
	setActionRuns: (runs: ActionRun[]) => void;
	updateActionRun: (id: string, updates: Partial<ActionRun>) => void;
	addActionRun: (run: ActionRun) => void;
	setBridgeStatus: (status: BridgeStatus) => void;
	selectProject: (id: string | null) => void;
	selectFeature: (id: string | null) => void;
	selectArtifact: (id: string | null) => void;
	setConnected: (connected: boolean) => void;
	openModal: (modal: ModalType) => void;
	closeModal: () => void;
}

export const useStore = create<BlueprintStore>((set) => ({
	projects: [],
	features: [],
	steps: [],
	artifacts: [],
	memories: [],
	interviews: [],
	actionRuns: [],
	bridgeStatus: "not_connected",
	selectedProjectId: null,
	selectedFeatureId: null,
	selectedArtifactId: null,
	connected: false,
	activeModal: null,

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
	setBridgeStatus: (bridgeStatus) => set({ bridgeStatus }),
	selectProject: (id) =>
		set({
			selectedProjectId: id,
			selectedFeatureId: null,
			selectedArtifactId: null,
		}),
	selectFeature: (id) =>
		set({ selectedFeatureId: id, selectedArtifactId: null }),
	selectArtifact: (id) => set({ selectedArtifactId: id }),
	setConnected: (connected) => set({ connected }),
	openModal: (modal) => set({ activeModal: modal }),
	closeModal: () => set({ activeModal: null }),
}));
