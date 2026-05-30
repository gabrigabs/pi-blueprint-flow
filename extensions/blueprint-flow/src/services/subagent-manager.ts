import { nanoid } from "nanoid";
import { getPiRef } from "./pi-config-reader.js";
import { bus } from "../events.js";

export interface SubagentConfig {
	id: string;
	featureId: string;
	projectId: string;
	stepName: string;
	actionType: string;
	profile: string;
	modelId?: string;
	thinkingLevel?: string;
	prompt: string;
	timeout: number;
}

export interface SubagentResult {
	success: boolean;
	output: string;
	artifacts: SubagentArtifact[];
	summary: string;
	error?: string;
}

export interface SubagentArtifact {
	type: string;
	filename: string;
	content: string;
}

export async function spawnSubagent(config: SubagentConfig): Promise<SubagentResult> {
	const pi = getPiRef();
	if (!pi) {
		return {
			success: false,
			output: "",
			artifacts: [],
			summary: "",
			error: "Pi not connected",
		};
	}

	bus.emit("action:event", {
		actionRunId: config.id,
		type: "subagent_spawned",
		message: `Spawning ${config.actionType} sub-agent for step "${config.stepName}"`,
		dataJson: null,
	});

	try {
		const args = [
			"--mode", "rpc",
			"--no-session",
			"--no-extensions",
			"--extension", config.profile,
		];

		if (config.modelId) {
			args.push("--model", config.modelId);
		}
		if (config.thinkingLevel) {
			args.push("--thinking-level", config.thinkingLevel);
		}

		const result = await pi.exec("pi", args, {
			input: config.prompt,
			timeout: config.timeout,
		});

		if (result.exitCode !== 0) {
			return {
				success: false,
				output: result.stderr || result.stdout,
				artifacts: [],
				summary: "",
				error: `Sub-agent exited with code ${result.exitCode}: ${result.stderr.slice(0, 500)}`,
			};
		}

		return parseSubagentOutput(result.stdout);
	} catch (err: any) {
		return {
			success: false,
			output: err?.stderr ?? "",
			artifacts: [],
			summary: "",
			error: err?.message ?? "Unknown error spawning sub-agent",
		};
	}
}

function parseSubagentOutput(stdout: string): SubagentResult {
	const artifacts: SubagentArtifact[] = [];
	let summary = "";
	let fullText = "";

	const lines = stdout.split("\n").filter(Boolean);

	for (const line of lines) {
		try {
			const msg = JSON.parse(line);
			if (msg.type === "rpc_response" && msg.content) {
				const text = msg.content
					.filter((c: any) => c.type === "text")
					.map((c: any) => c.text)
					.join("\n");

				fullText += text + "\n";
			}
		} catch {
			fullText += line + "\n";
		}
	}

	// Extract ```blueprint-artifact blocks
	const artifactPattern = /```blueprint-artifact\s*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = artifactPattern.exec(fullText)) !== null) {
		try {
			const parsed = JSON.parse(match[1]);
			if (parsed.type && parsed.filename && parsed.content) {
				artifacts.push(parsed);
			}
		} catch {
			// Not valid JSON artifact block
		}
	}

	// Extract summary (last ``` block that isn't an artifact)
	const summaryPattern = /```summary\s*\n([\s\S]*?)```/g;
	let summaryMatch: RegExpExecArray | null;
	while ((summaryMatch = summaryPattern.exec(fullText)) !== null) {
		summary = summaryMatch[1].trim();
	}

	if (!summary) {
		// Fallback: use last 500 chars as summary
		const cleaned = fullText
			.replace(/```blueprint-artifact[\s\S]*?```/g, "")
			.trim();
		summary = cleaned.slice(-500);
	}

	return {
		success: true,
		output: fullText,
		artifacts,
		summary,
	};
}

export function buildSubagentPrompt(context: {
	featureTitle: string;
	featureDescription: string | null;
	stepName: string;
	projectStack: string;
	previousArtifacts: string[];
	interviewAnswers: string[];
	memories: string[];
}): string {
	const sections: string[] = [];

	sections.push(`# Task: ${context.stepName} for "${context.featureTitle}"`);

	if (context.featureDescription) {
		sections.push(`## Feature Description\n${context.featureDescription}`);
	}

	sections.push(`## Project Stack\n${context.projectStack}`);

	if (context.interviewAnswers.length > 0) {
		sections.push(`## Interview Answers\n${context.interviewAnswers.join("\n")}`);
	}

	if (context.previousArtifacts.length > 0) {
		sections.push(`## Previous Artifacts\n${context.previousArtifacts.join("\n---\n")}`);
	}

	if (context.memories.length > 0) {
		sections.push(`## Project Memory\n${context.memories.join("\n")}`);
	}

	sections.push(
		"## Output Instructions",
		"Save your output using `blueprint_save_artifact`. When done, output a summary in a ```summary block.",
	);

	return sections.join("\n\n");
}
