import { Type } from "@sinclair/typebox";

export const researchWebTool = {
  name: "blueprint_research_web",
  label: "Blueprint: Research Web",
  description:
    "Search the web for documentation, patterns, and best practices relevant to a feature. (Post-MVP: requires configuration of a search provider.)",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
    context: Type.Optional(
      Type.String({ description: "Additional context about what you're looking for" })
    ),
  }),
  execute: async (
    _toolCallId: string,
    params: { query: string; context?: string }
  ) => {
    return {
      content: [
        {
          type: "text" as const,
          text: `Web research is not yet configured. This feature will be available in a future release.\n\nQuery: "${params.query}"\n\nFor now, use blueprint_research_repo for local codebase research, or ask the user to provide relevant documentation.`,
        },
      ],
      details: { status: "not_configured", query: params.query },
    };
  },
};
