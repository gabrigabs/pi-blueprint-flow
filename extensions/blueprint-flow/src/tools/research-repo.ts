import { execFileSync } from "node:child_process";
import { Type } from "@sinclair/typebox";

export const researchRepoTool = {
	name: "blueprint_research_repo",
	label: "Blueprint: Research Repository",
	description:
		"Search the local repository for relevant code, patterns, and architecture. Use this during the research step to understand existing code before designing a feature. Supports grep (content search), find (file search), and structure (directory tree).",
	parameters: Type.Object({
		mode: Type.String({
			description:
				"Search mode: 'grep' (content search), 'find' (file name search), 'structure' (directory tree)",
		}),
		query: Type.String({
			description:
				"Search query — regex pattern for grep, glob for find, path for structure",
		}),
		path: Type.Optional(
			Type.String({
				description: "Subdirectory to scope the search (default: '.')",
			}),
		),
		max_results: Type.Optional(
			Type.Number({ description: "Maximum results to return (default: 30)" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			mode: string;
			query: string;
			path?: string;
			max_results?: number;
		},
	) => {
		const cwd = process.cwd();
		const searchPath = params.path || ".";
		const maxResults = params.max_results ?? 30;

		try {
			let output: string;

			switch (params.mode) {
				case "grep": {
					try {
						output = execFileSync(
							"rg",
							[
								"--no-heading",
								"--line-number",
								"--max-count",
								String(maxResults),
								"-e",
								params.query,
								searchPath,
							],
							{ cwd, encoding: "utf-8", timeout: 10000 },
						).trim();
					} catch {
						// Fallback to grep if rg not available or no matches
						output = execFileSync(
							"grep",
							[
								"-rn",
								`--include=*.{ts,tsx,js,jsx,py,go,rs,java,md}`,
								`-m`,
								String(maxResults),
								params.query,
								searchPath,
							],
							{ cwd, encoding: "utf-8", timeout: 10000 },
						).trim();
					}
					break;
				}
				case "find": {
					try {
						output = execFileSync(
							"fd",
							[params.query, searchPath, "--max-results", String(maxResults)],
							{ cwd, encoding: "utf-8", timeout: 10000 },
						).trim();
					} catch {
						output = execFileSync(
							"find",
							[searchPath, "-name", params.query, "-type", "f"],
							{ cwd, encoding: "utf-8", timeout: 10000 },
						).trim();
						// Limit results manually for find
						const lines = output.split("\n");
						if (lines.length > maxResults) {
							output = lines.slice(0, maxResults).join("\n");
						}
					}
					break;
				}
				case "structure": {
					const depth = Math.min(maxResults, 4);
					const raw = execFileSync(
						"find",
						[
							searchPath,
							"-maxdepth",
							String(depth),
							"-type",
							"f",
							"-not",
							"-path",
							"*/node_modules/*",
							"-not",
							"-path",
							"*/.git/*",
						],
						{ cwd, encoding: "utf-8", timeout: 10000 },
					).trim();
					const lines = raw.split("\n").sort().slice(0, 100);
					output = lines.join("\n");
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
					content: [
						{
							type: "text" as const,
							text: `No results found for "${params.query}" in ${searchPath}.`,
						},
					],
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
					content: [
						{
							type: "text" as const,
							text: `No results found for "${params.query}" in ${searchPath}.`,
						},
					],
					details: { results: [], count: 0 },
				};
			}
			return {
				content: [
					{ type: "text" as const, text: `Research error: ${err.message}` },
				],
				details: { error: err.message },
			};
		}
	},
};
