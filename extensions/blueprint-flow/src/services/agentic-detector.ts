import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isBlockedPath, isFileSizeAllowed } from "./path-validator.js";

export interface AgenticFile {
	path: string;
	relativePath: string;
	type: string;
	size: number;
	extractedRules: string[];
}

const AGENTIC_PATTERNS: { pattern: string; type: string; isDir?: boolean }[] = [
	{ pattern: "AGENTS.md", type: "pi-agents" },
	{ pattern: "CLAUDE.md", type: "claude-code" },
	{ pattern: ".claude", type: "claude-config", isDir: true },
	{ pattern: "GEMINI.md", type: "gemini" },
	{ pattern: ".cursorrules", type: "cursor-rules" },
	{ pattern: ".cursor/rules", type: "cursor-rules-dir", isDir: true },
	{ pattern: ".windsurfrules", type: "windsurf-rules" },
	{ pattern: ".github/copilot-instructions.md", type: "copilot-instructions" },
	{ pattern: ".ai", type: "ai-config-dir", isDir: true },
	{ pattern: ".aider", type: "aider-config", isDir: true },
	{ pattern: ".continue", type: "continue-config", isDir: true },
];

/** Detects agentic configuration files in a repository */
export function detectAgenticFiles(repoPath: string): AgenticFile[] {
	const found: AgenticFile[] = [];

	for (const { pattern, type, isDir } of AGENTIC_PATTERNS) {
		const fullPath = join(repoPath, pattern);

		if (!existsSync(fullPath)) continue;

		try {
			const stat = statSync(fullPath);

			if (isDir && stat.isDirectory()) {
				const dirFiles = scanDirectory(fullPath, repoPath, type);
				found.push(...dirFiles);
			} else if (!isDir && stat.isFile()) {
				const file = processAgenticFile(fullPath, repoPath, type);
				if (file) found.push(file);
			}
		} catch {
			// skip inaccessible files
		}
	}

	return found;
}

function scanDirectory(
	dirPath: string,
	repoPath: string,
	type: string,
): AgenticFile[] {
	const results: AgenticFile[] = [];

	try {
		const entries = readdirSync(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (results.length >= 20) break;

			const entryPath = join(dirPath, entry.name);
			const relPath = relative(repoPath, entryPath);

			if (isBlockedPath(relPath)) continue;

			if (entry.isFile()) {
				const file = processAgenticFile(entryPath, repoPath, type);
				if (file) results.push(file);
			}
		}
	} catch {
		// skip unreadable directories
	}

	return results;
}

function processAgenticFile(
	filePath: string,
	repoPath: string,
	type: string,
): AgenticFile | null {
	if (!isFileSizeAllowed(filePath)) return null;

	try {
		const stat = statSync(filePath);
		const content = readFileSync(filePath, "utf-8");
		const rules = extractRules(content);

		return {
			path: filePath,
			relativePath: relative(repoPath, filePath),
			type,
			size: stat.size,
			extractedRules: rules,
		};
	} catch {
		return null;
	}
}

/** Extracts actionable rules from agentic file content */
function extractRules(content: string): string[] {
	const rules: string[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines, headers, and very short lines
		if (!trimmed || trimmed.startsWith("#") || trimmed.length < 10) continue;

		// Detect rule-like patterns
		const isRule =
			trimmed.startsWith("- ") ||
			trimmed.startsWith("* ") ||
			trimmed.startsWith("• ") ||
			/^(always|never|prefer|avoid|use|do not|don't|ensure|must|should)/i.test(
				trimmed,
			);

		if (isRule && trimmed.length <= 200) {
			const cleaned = trimmed.replace(/^[-*•]\s*/, "").trim();
			if (cleaned.length >= 10) {
				rules.push(cleaned);
			}
		}
	}

	return rules.slice(0, 50);
}
