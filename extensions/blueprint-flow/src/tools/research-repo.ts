import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";

export const researchRepoTool = {
  name: "blueprint_research_repo",
  label: "Blueprint: Research Repository",
  description:
    "Search the local repository for relevant code, patterns, and architecture. Use this during the research step to understand existing code before designing a feature. Supports grep (content search), find (file search), and structure (directory tree).",
  parameters: Type.Object({
    mode: Type.String({
      description: "Search mode: 'grep' (content search), 'find' (file name search), 'structure' (directory tree)",
    }),
    query: Type.String({
      description: "Search query — regex pattern for grep, glob for find, path for structure",
    }),
    path: Type.Optional(
      Type.String({ description: "Subdirectory to scope the search (default: '.')" })
    ),
    max_results: Type.Optional(
      Type.Number({ description: "Maximum results to return (default: 30)" })
    ),
  }),
  execute: async (
    _toolCallId: string,
    params: { mode: string; query: string; path?: string; max_results?: number }
  ) => {
    const cwd = process.cwd();
    const searchPath = params.path || ".";
    const maxResults = params.max_results ?? 30;

    try {
      let output: string;

      switch (params.mode) {
        case "grep": {
          // Use ripgrep if available, fallback to grep
          const cmd = `rg --no-heading --line-number --max-count ${maxResults} -e ${JSON.stringify(params.query)} ${JSON.stringify(searchPath)} 2>/dev/null || grep -rn --include='*.{ts,tsx,js,jsx,py,go,rs,java,md}' -m ${maxResults} ${JSON.stringify(params.query)} ${JSON.stringify(searchPath)} 2>/dev/null`;
          output = execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000 }).trim();
          break;
        }
        case "find": {
          const cmd = `fd ${JSON.stringify(params.query)} ${JSON.stringify(searchPath)} --max-results ${maxResults} 2>/dev/null || find ${JSON.stringify(searchPath)} -name ${JSON.stringify(params.query)} -type f 2>/dev/null | head -${maxResults}`;
          output = execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000 }).trim();
          break;
        }
        case "structure": {
          const depth = Math.min(maxResults, 4);
          const cmd = `find ${JSON.stringify(searchPath)} -maxdepth ${depth} -type f | grep -v node_modules | grep -v .git | sort | head -100`;
          output = execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000 }).trim();
          break;
        }
        default:
          return {
            content: [
              {
                type: "text" as const,
                text: `Invalid mode: "${params.mode}". Use 'grep', 'find', or 'structure'.`,
              },
            ],
            details: { error: "invalid_mode" },
          };
      }

      if (!output) {
        return {
          content: [{ type: "text" as const, text: `No results found for "${params.query}" in ${searchPath}.` }],
          details: { results: [], count: 0 },
        };
      }

      const lines = output.split("\n");
      const truncated = lines.length >= maxResults;

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${lines.length} results${truncated ? " (truncated)" : ""}:\n\n\`\`\`\n${output}\n\`\`\``,
          },
        ],
        details: { results: lines, count: lines.length, truncated },
      };
    } catch (err: any) {
      // Commands return exit code 1 when no matches found
      if (err.status === 1) {
        return {
          content: [{ type: "text" as const, text: `No results found for "${params.query}" in ${searchPath}.` }],
          details: { results: [], count: 0 },
        };
      }
      return {
        content: [{ type: "text" as const, text: `Research error: ${err.message}` }],
        details: { error: err.message },
      };
    }
  },
};
