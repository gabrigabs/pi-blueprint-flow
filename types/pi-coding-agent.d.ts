declare module "@earendil-works/pi-coding-agent" {
	interface UIContext {
		notify(message: string, level?: "info" | "error" | "warn"): void;
		input(prompt: string): Promise<string | null>;
	}

	interface CommandContext {
		ui: UIContext;
		modelRegistry: ModelRegistry;
	}

	interface ModelRegistry {
		find(provider: string, modelId: string): Model | undefined;
	}

	type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

	interface ModelCost {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	}

	interface Model {
		id: string;
		name: string;
		provider: string;
		api: string;
		reasoning: boolean;
		input: string[];
		cost: ModelCost;
		contextWindow: number;
		maxTokens: number;
	}

	interface ExtensionAPI {
		on(
			event: string,
			handler: (...args: unknown[]) => Promise<void> | void,
		): void;
		registerTool(tool: unknown): void;
		registerCommand(
			name: string,
			config: {
				description: string;
				handler: (
					args: string | undefined,
					ctx: CommandContext,
				) => Promise<void>;
			},
		): void;
		sendUserMessage(message: string): void;
		getAvailableModels(): Model[];
		getThinkingLevel(): ThinkingLevel;
		setThinkingLevel(level: ThinkingLevel): void;
		setModel(model: Model): Promise<boolean>;
	}
}
