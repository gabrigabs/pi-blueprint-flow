declare module "@earendil-works/pi-coding-agent" {
  interface UIContext {
    notify(message: string): void;
    input(prompt: string): Promise<string | null>;
  }

  interface CommandContext {
    ui: UIContext;
  }

  interface ExtensionAPI {
    on(event: string, handler: (...args: unknown[]) => Promise<void> | void): void;
    registerTool(tool: unknown): void;
    registerCommand(name: string, config: {
      description: string;
      handler: (args: string | undefined, ctx: CommandContext) => Promise<void>;
    }): void;
    sendUserMessage(message: string): void;
  }
}
