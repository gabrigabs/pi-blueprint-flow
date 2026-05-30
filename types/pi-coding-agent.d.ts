declare module "@earendil-works/pi-coding-agent" {
	// --- Content Types ---
	interface TextContent {
		type: "text";
		text: string;
	}

	interface ImageContent {
		type: "image";
		source: { type: string; mediaType: string; data: string };
	}

	// --- Send Options ---
	interface SendMessageOptions {
		triggerTurn?: boolean;
		deliverAs?: "steer" | "followUp" | "nextTurn";
	}

	// --- Event Payloads ---
	interface AgentStartEvent {
		prompt: string;
		images?: unknown[];
		systemPrompt: string;
		systemPromptOptions: unknown;
	}

	interface AgentEndEvent {
		messages: unknown[];
	}

	interface TurnStartEvent {
		turnIndex: number;
		timestamp: number;
	}

	interface TurnEndEvent {
		turnIndex: number;
		toolResults: unknown[];
	}

	interface MessageUpdateEvent {
		message: unknown;
		assistantMessageEvent: AssistantMessageEvent;
	}

	interface ToolExecutionStartEvent {
		toolCallId: string;
		toolName: string;
		args: unknown;
	}

	interface ToolExecutionUpdateEvent {
		toolCallId: string;
		toolName: string;
		args: unknown;
		partialResult: unknown;
	}

	interface ToolExecutionEndEvent {
		toolCallId: string;
		toolName: string;
		result: unknown;
		isError: boolean;
	}

	interface ToolCallEvent {
		toolName: string;
		input: unknown;
	}

	interface ToolResultEvent {
		content?: unknown[];
		details?: unknown;
		isError?: boolean;
	}

	type AssistantMessageEvent =
		| { type: "text_delta"; delta: string }
		| { type: "thinking_delta"; delta: string }
		| { type: "tool_use"; toolName: string; args: unknown }
		| {
				type: "tool_result";
				toolName: string;
				result: unknown;
				isError: boolean;
		  }
		| { type: "done" };

	// --- UI Context ---
	interface UIContext {
		notify(message: string, level?: "info" | "error" | "warn"): void;
		input(prompt: string): Promise<string | null>;
		confirm(title: string, message: string, opts?: unknown): Promise<boolean>;
		select(
			title: string,
			options: string[],
			opts?: unknown,
		): Promise<string | undefined>;
	}

	// --- Extension Context ---
	interface ExtensionContext {
		isIdle(): boolean;
		signal?: AbortSignal;
		abort(): void;
		shutdown(): void;
		cwd: string;
		hasUI: boolean;
		ui: UIContext;
	}

	type ExtensionHandler<E = unknown, R = void> = (
		event: E,
		ctx: ExtensionContext,
	) => Promise<R> | R;

	// --- Command Context ---
	interface CommandContext {
		ui: UIContext;
		modelRegistry: ModelRegistry;
	}

	interface ModelRegistry {
		find(provider: string, modelId: string): Model | undefined;
		getAvailable(): Promise<Model[]>;
	}

	interface AuthStorage {}

	const AuthStorage: {
		create(path?: string): AuthStorage;
	};

	const ModelRegistry: {
		create(authStorage: AuthStorage, modelsPath?: string): ModelRegistry;
		inMemory(authStorage: AuthStorage): ModelRegistry;
	};

	// --- Model & Thinking ---
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

	// --- Event Bus ---
	interface ExtensionEventBus {
		on(event: string, handler: (...args: unknown[]) => void): () => void;
		emit(event: string, data?: unknown): void;
	}

	// --- Extension API ---
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
		sendMessage<T = unknown>(
			message: { customType: string; content?: T; display?: boolean },
			options?: SendMessageOptions,
		): void;
		sendUserMessage(
			content: string | (TextContent | ImageContent)[],
			options?: SendMessageOptions,
		): void;
		appendEntry<T = unknown>(customType: string, data?: T): void;
		getAvailableModels(): Model[];
		getThinkingLevel(): ThinkingLevel;
		setThinkingLevel(level: ThinkingLevel): void;
		setModel(model: Model): Promise<boolean>;
		getActiveTools(): string[];
		events: ExtensionEventBus;
		exec(
			command: string,
			args: string[],
			options?: unknown,
		): Promise<{ exitCode: number; stdout: string; stderr: string }>;
	}
}
