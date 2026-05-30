import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	AuthStorage,
	ModelRegistry as ModelRegistryFactory,
	type AuthStorage as PiAuthStorage,
	type ExtensionAPI,
	type Model,
	type ModelRegistry,
	type ThinkingLevel,
} from "@earendil-works/pi-coding-agent";
import { bus } from "../events.js";

const PI_AGENT_DIR = join(homedir(), ".pi", "agent");
const SETTINGS_PATH = join(PI_AGENT_DIR, "settings.json");

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
	maxTokens: number;
	cost: { input: number; output: number };
}

/** Shared references to Pi runtime services, set from index.ts */
let piRef: ExtensionAPI | null = null;
let modelRegistryRef: ModelRegistry | null = null;
let localModelRegistry: ModelRegistry | null | undefined;

export function setPiRef(pi: ExtensionAPI): void {
	piRef = pi;
	emitConfigUpdated();
}

export function setModelRegistry(modelRegistry: ModelRegistry): void {
	modelRegistryRef = modelRegistry;
	emitConfigUpdated();
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

function toAgentModelInfo(model: Model): AgentModelInfo {
	return {
		id: model.id,
		name: model.name,
		provider: model.provider,
		reasoning: model.reasoning,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
		cost: { input: model.cost.input, output: model.cost.output },
	};
}

function getExtensionAvailableModels(): Model[] {
	if (!piRef) return [];
	try {
		return piRef.getAvailableModels();
	} catch {
		return [];
	}
}

async function getRegistryAvailableModels(): Promise<Model[]> {
	const modelRegistry = getModelRegistry();
	if (!modelRegistry) return [];
	try {
		return await modelRegistry.getAvailable();
	} catch {
		return [];
	}
}

function getModelRegistry(): ModelRegistry | null {
	if (modelRegistryRef) return modelRegistryRef;
	if (localModelRegistry !== undefined) return localModelRegistry;

	try {
		const authStorage: PiAuthStorage = AuthStorage.create();
		localModelRegistry = ModelRegistryFactory.create(authStorage);
	} catch {
		localModelRegistry = null;
	}

	return localModelRegistry;
}

export async function getAvailablePiModels(): Promise<Model[]> {
	const extensionModels = getExtensionAvailableModels();
	if (extensionModels.length > 0) return extensionModels;

	return getRegistryAvailableModels();
}

export async function findAvailablePiModel(
	modelId: string,
	provider?: string,
): Promise<Model | undefined> {
	const models = await getAvailablePiModels();
	const availableModel = models.find(
		(model) => model.id === modelId && (!provider || model.provider === provider),
	);
	if (availableModel) return availableModel;

	const modelRegistry = getModelRegistry();
	const settings = getSettingsFromFile();
	const resolvedProvider = provider ?? settings?.defaultProvider;
	if (!modelRegistry || !resolvedProvider) return undefined;

	return modelRegistry.find(resolvedProvider, modelId);
}

export async function getAgentConfig(): Promise<AgentConfig> {
	const settings = getSettingsFromFile();

	let currentThinkingLevel: ThinkingLevel | null = null;

	const availableModels = await getAvailablePiModels();
	const fallbackDefaultModel =
		availableModels.length === 0 &&
		settings?.defaultProvider &&
		settings.defaultModel
			? getModelRegistry()?.find(settings.defaultProvider, settings.defaultModel)
			: undefined;
	const models = (
		fallbackDefaultModel ? [fallbackDefaultModel] : availableModels
	).map(toAgentModelInfo);

	if (piRef) {
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
		currentThinkingLevel:
			currentThinkingLevel ?? settings?.defaultThinkingLevel ?? null,
	};
}

export function emitConfigUpdated(): void {
	if (!piRef) return;
	void getAgentConfig()
		.then((config) => {
			bus.emit("config:updated", {
				models: config.models,
				currentThinkingLevel: config.currentThinkingLevel,
			});
		})
		.catch(() => {
			// Non-critical — config emission is best-effort
		});
}
