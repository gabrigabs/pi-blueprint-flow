import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  feature_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
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

interface BlueprintStore {
  // State
  projects: Project[];
  features: Feature[];
  steps: Step[];
  artifacts: Artifact[];
  memories: Memory[];
  interviews: Interview[];
  selectedProjectId: string | null;
  selectedFeatureId: string | null;
  selectedArtifactId: string | null;
  connected: boolean;

  // Actions
  setProjects: (projects: Project[]) => void;
  setFeatures: (features: Feature[]) => void;
  setSteps: (steps: Step[]) => void;
  setArtifacts: (artifacts: Artifact[]) => void;
  setMemories: (memories: Memory[]) => void;
  setInterviews: (interviews: Interview[]) => void;
  selectProject: (id: string | null) => void;
  selectFeature: (id: string | null) => void;
  selectArtifact: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
}

export const useStore = create<BlueprintStore>((set) => ({
  projects: [],
  features: [],
  steps: [],
  artifacts: [],
  memories: [],
  interviews: [],
  selectedProjectId: null,
  selectedFeatureId: null,
  selectedArtifactId: null,
  connected: false,

  setProjects: (projects) => set({ projects }),
  setFeatures: (features) => set({ features }),
  setSteps: (steps) => set({ steps }),
  setArtifacts: (artifacts) => set({ artifacts }),
  setMemories: (memories) => set({ memories }),
  setInterviews: (interviews) => set({ interviews }),
  selectProject: (id) => set({ selectedProjectId: id, selectedFeatureId: null, selectedArtifactId: null }),
  selectFeature: (id) => set({ selectedFeatureId: id, selectedArtifactId: null }),
  selectArtifact: (id) => set({ selectedArtifactId: id }),
  setConnected: (connected) => set({ connected }),
}));
