type EventHandler<T = unknown> = (data: T) => void;

export interface BlueprintEvents {
  "project:created": { id: string; name: string };
  "project:updated": { id: string };
  "feature:created": { id: string; projectId: string; title: string };
  "feature:updated": { id: string; step: string; status: string };
  "step:advanced": { featureId: string; from: string; to: string };
  "artifact:saved": { id: string; featureId: string; type: string };
  "memory:saved": { id: string; projectId: string; category: string };
  "interview:asked": { id: string; featureId: string; question: string };
  "interview:answered": { id: string; answer: string };
  "server:started": { port: number };
  "server:stopped": {};
}

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<K extends keyof BlueprintEvents>(event: K, handler: EventHandler<BlueprintEvents[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler);

    return () => {
      set.delete(handler as EventHandler);
    };
  }

  emit<K extends keyof BlueprintEvents>(event: K, data: BlueprintEvents[K]): void {
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
