import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ExtensionAPI, Model, ThinkingLevel } from "@earendil-works/pi-coding-agent";

const PI_AGENT_DIR = join(homedir(), ".pi", "agent");
const SETTINGS_PATH = join(PI_AGENT_DIR, "settings.json");
const MODELS_PATH = join(PI_AGENT_DIR, "models.json");

export const THINKING_LEVELS: ThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

interface PiSettings {
  defaultProvider?: string;
  defaultModel?: string;
  defaultThinkingLevel?: ThinkingLevel;
  providers?: Record<string, { baseUrl?: string }>;
  packages?: string[];
}

interface PiModelsConfig {
  providers?: Record<string, { baseUrl?: string }>;
}

export interface AgentConfig {
  defaultProvider: string | null;
  defaultModel: string | null;
  defaultThinkingLevel: ThinkingLevel;
  thinkingLevels: ThinkingLevel[];
  models: AgentModelInfo[];
  currentThinkingLevel: ThinkingLevel | null;
}

export interface AgentModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  contextWindow: number;
}

/** Shared reference to the Pi ExtensionAPI, set from index.ts */
let piRef: ExtensionAPI | null = null;

export function setPiRef(pi: ExtensionAPI): void {
  piRef = pi;
}

export function getPiRef(): ExtensionAPI | null {
  return piRef;
}

function readJsonFile<T>(path: string): T | null {
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getSettingsFromFile(): PiSettings | null {
  return readJsonFile<PiSettings>(SETTINGS_PATH);
}

function getModelsConfigFromFile(): PiModelsConfig | null {
  return readJsonFile<PiModelsConfig>(MODELS_PATH);
}

export function getAgentConfig(): AgentConfig {
  const settings = getSettingsFromFile();
  const modelsConfig = getModelsConfigFromFile();

  let models: AgentModelInfo[] = [];
  let currentThinkingLevel: ThinkingLevel | null = null;

  // Try to get live models from Pi API
  if (piRef) {
    try {
      const liveModels = piRef.getAvailableModels();
      models = liveModels.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        reasoning: m.reasoning,
        contextWindow: m.contextWindow,
      }));
    } catch {
      // Fallback below
    }

    try {
      currentThinkingLevel = piRef.getThinkingLevel();
    } catch {
      // Fallback to settings
    }
  }

  return {
    defaultProvider: settings?.defaultProvider ?? null,
    defaultModel: settings?.defaultModel ?? null,
    defaultThinkingLevel: settings?.defaultThinkingLevel ?? "medium",
    thinkingLevels: THINKING_LEVELS,
    models,
    currentThinkingLevel: currentThinkingLevel ?? settings?.defaultThinkingLevel ?? null,
  };
}
