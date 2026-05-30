type EventHandler<T = unknown> = (data: T) => void;

export interface BlueprintEvents {
	"project:created": { id: string; name: string };
	"project:updated": { id: string };
	"project:archived": { id: string };
	"feature:created": { id: string; projectId: string; title: string };
	"feature:updated": { id: string; step: string; status: string };
	"step:advanced": { featureId: string; from: string; to: string };
	"step:back": { featureId: string; from: string; to: string };
	"step:status_changed": {
		featureId: string;
		stepName: string;
		status: string;
	};
	"artifact:saved": {
		id: string;
		featureId: string;
		stepName?: string | null;
		type: string;
		filename?: string;
	};
	"artifact:updated": {
		id: string;
		featureId: string;
		type?: string;
	};
	"memory:saved": { id: string; projectId: string; category: string };
	"interview:asked": {
		id: string;
		featureId: string;
		question: string;
		responseType?: string;
		options?: string[];
	};
	"interview:answered": { id: string; answer: string };
	"import:started": { id: string; repoPath: string };
	"import:completed": { id: string; projectId: string | null };
	"settings:saved": { id: string; featureId: string | null };
	"server:started": { port: number };
	"server:stopped": {};
	// Action Run events
	"action:created": {
		id: string;
		actionType: string;
		status: string;
		featureId?: string;
		projectId?: string;
	};
	"action:updated": { id: string; status: string; error?: string };
	"action:event": {
		actionRunId: string;
		type: string;
		message: string | null;
		dataJson: unknown;
	};
	"action:completed": { id: string; status: string };
	"action:failed": { id: string; error: string };
	"import:pi_analysis_requested": { reportId: string; actionRunId: string };
	"config:updated": {
		models: {
			id: string;
			name: string;
			provider: string;
			reasoning: boolean;
			contextWindow: number;
			maxTokens: number;
			cost: { input: number; output: number };
		}[];
		currentThinkingLevel: string | null;
	};
}

class EventBus {
	private handlers = new Map<string, Set<EventHandler>>();

	on<K extends keyof BlueprintEvents>(
		event: K,
		handler: EventHandler<BlueprintEvents[K]>,
	): () => void {
		if (!this.handlers.has(event)) {
			this.handlers.set(event, new Set());
		}
		const set = this.handlers.get(event)!;
		set.add(handler as EventHandler);

		return () => {
			set.delete(handler as EventHandler);
		};
	}

	emit<K extends keyof BlueprintEvents>(
		event: K,
		data: BlueprintEvents[K],
	): void {
		const set = this.handlers.get(event);
		if (set) {
			for (const handler of set) {
				handler(data);
			}
		}
	}

	removeAll(): void {
		this.handlers.clear();
	}
}

export const bus = new EventBus();
