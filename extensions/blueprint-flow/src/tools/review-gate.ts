import { Type } from "@sinclair/typebox";
import type { Artifact, Flow, Step } from "../db.js";
import { getDb } from "../db.js";

interface DisciplineScores {
	assumptionsScore: number;
	simplicityScore: number;
	surgicalChangeScore: number;
	verificationScore: number;
	overallDisciplineScore: number;
}

function evaluateDiscipline(
	artifacts: Artifact[],
	feature: Flow,
): DisciplineScores {
	const allContent = artifacts
		.map((a) => a.content)
		.join("\n")
		.toLowerCase();

	const assumptionsScore = evaluateAssumptions(allContent);
	const simplicityScore = evaluateSimplicity(allContent, artifacts);
	const surgicalChangeScore = evaluateSurgicalChanges(allContent, artifacts);
	const verificationScore = evaluateVerification(allContent);

	const overallDisciplineScore =
		assumptionsScore * 0.2 +
		simplicityScore * 0.25 +
		surgicalChangeScore * 0.25 +
		verificationScore * 0.3;

	return {
		assumptionsScore: round(assumptionsScore),
		simplicityScore: round(simplicityScore),
		surgicalChangeScore: round(surgicalChangeScore),
		verificationScore: round(verificationScore),
		overallDisciplineScore: round(overallDisciplineScore),
	};
}

function evaluateAssumptions(content: string): number {
	let score = 0.5;

	const assumptionIndicators = [
		"assumption",
		"assuming",
		"we assume",
		"i assume",
		"presume",
		"given that",
		"constraint",
		"prerequisite",
	];

	const questionIndicators = [
		"open question",
		"unclear",
		"ambiguity",
		"need to clarify",
		"to be confirmed",
		"tbd",
	];

	for (const indicator of assumptionIndicators) {
		if (content.includes(indicator)) {
			score += 0.1;
		}
	}

	for (const indicator of questionIndicators) {
		if (content.includes(indicator)) {
			score += 0.05;
		}
	}

	return Math.min(score, 1.0);
}

function evaluateSimplicity(content: string, artifacts: Artifact[]): number {
	let score = 0.7;

	const overengineeringIndicators = [
		"abstract factory",
		"generic",
		"extensible",
		"future-proof",
		"plugin system",
		"configurable",
		"dynamic",
	];

	for (const indicator of overengineeringIndicators) {
		if (content.includes(indicator)) {
			score -= 0.05;
		}
	}

	const simplicityIndicators = [
		"simple",
		"minimal",
		"straightforward",
		"direct",
		"kiss",
		"yagni",
	];

	for (const indicator of simplicityIndicators) {
		if (content.includes(indicator)) {
			score += 0.05;
		}
	}

	const codeArtifacts = artifacts.filter((a) => a.type === "code");
	if (codeArtifacts.length > 10) {
		score -= 0.1;
	}

	return Math.max(0, Math.min(score, 1.0));
}

function evaluateSurgicalChanges(
	content: string,
	artifacts: Artifact[],
): number {
	let score = 0.7;

	const planArtifacts = artifacts.filter(
		(a) => a.type === "implementation_plan",
	);
	if (planArtifacts.length > 0) {
		score += 0.1;

		const planContent = planArtifacts
			.map((a) => a.content)
			.join("\n")
			.toLowerCase();
		if (
			planContent.includes("files to modify") ||
			planContent.includes("files to create")
		) {
			score += 0.1;
		}
	}

	if (content.includes("refactor") && !content.includes("requested refactor")) {
		score -= 0.1;
	}

	if (content.includes("out of scope") || content.includes("not included")) {
		score += 0.1;
	}

	return Math.max(0, Math.min(score, 1.0));
}

function evaluateVerification(content: string): number {
	let score = 0.3;

	const verificationIndicators = [
		"test",
		"tested",
		"verified",
		"validation",
		"build pass",
		"lint pass",
		"typecheck",
		"type-check",
		"all tests pass",
		"manual check",
		"confirmed",
	];

	for (const indicator of verificationIndicators) {
		if (content.includes(indicator)) {
			score += 0.1;
		}
	}

	const riskIndicators = [
		"risk",
		"limitation",
		"known issue",
		"caveat",
		"trade-off",
		"tradeoff",
	];

	for (const indicator of riskIndicators) {
		if (content.includes(indicator)) {
			score += 0.05;
		}
	}

	return Math.max(0, Math.min(score, 1.0));
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}

function formatDisciplineGate(scores: DisciplineScores): string {
	const lines: string[] = ["", "### Coding Discipline Gate", ""];

	const scoreBar = (score: number): string => {
		if (score >= 0.8) return `${score.toFixed(2)} ✓`;
		if (score >= 0.6) return `${score.toFixed(2)} ~`;
		return `${score.toFixed(2)} ✗`;
	};

	lines.push(`  Assumptions declared: ${scoreBar(scores.assumptionsScore)}`);
	lines.push(`  Simplicity: ${scoreBar(scores.simplicityScore)}`);
	lines.push(`  Surgical changes: ${scoreBar(scores.surgicalChangeScore)}`);
	lines.push(`  Verification: ${scoreBar(scores.verificationScore)}`);
	lines.push(
		`  **Overall discipline: ${scoreBar(scores.overallDisciplineScore)}**`,
	);

	if (scores.overallDisciplineScore < 0.6) {
		lines.push("");
		lines.push("  **Recommendations:**");
		if (scores.assumptionsScore < 0.6) {
			lines.push("  - Declare assumptions explicitly before implementing");
		}
		if (scores.simplicityScore < 0.6) {
			lines.push("  - Simplify the solution — remove unnecessary abstractions");
		}
		if (scores.surgicalChangeScore < 0.6) {
			lines.push("  - Reduce scope — only modify files directly required");
		}
		if (scores.verificationScore < 0.6) {
			lines.push("  - Add verification — run tests, lint, or explain why not");
		}
	}

	return lines.join("\n");
}

export const reviewGateTool = {
	name: "blueprint_review_gate",
	label: "Blueprint: Review Gate",
	description:
		"Run a review gate check on a feature. Verifies artifact completeness, interview coverage, and coding discipline. Produces a readiness report with scores.",
	parameters: Type.Object({
		feature_id: Type.String({ description: "Feature ID to review" }),
		checklist: Type.Optional(
			Type.Array(Type.String(), {
				description:
					"Custom checklist items to verify (in addition to standard checks)",
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: { feature_id: string; checklist?: string[] },
	) => {
		const db = getDb();

		const feature = db
			.prepare("SELECT * FROM flows WHERE id = ?")
			.get(params.feature_id) as Flow | undefined;

		if (!feature) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Feature "${params.feature_id}" not found.`,
					},
				],
				details: { error: "feature_not_found" },
			};
		}

		const steps = db
			.prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
			.all(params.feature_id) as Step[];

		const artifacts = db
			.prepare("SELECT * FROM artifacts WHERE feature_id = ?")
			.all(params.feature_id) as Artifact[];

		const expectedArtifacts: Record<string, string[]> = {
			spec: ["spec"],
			ddd: ["domain_model"],
			behavior: ["scenario"],
			implementation_plan: ["implementation_plan"],
			implementation: ["code"],
		};

		const issues: string[] = [];
		const passed: string[] = [];

		for (const step of steps) {
			if (step.status !== "done") continue;

			const expected = expectedArtifacts[step.name];
			if (!expected) continue;

			for (const artifactType of expected) {
				const hasArtifact = artifacts.some(
					(a) => a.step_name === step.name && a.type === artifactType,
				);
				if (hasArtifact) {
					passed.push(`✓ Step "${step.name}" has ${artifactType} artifact`);
				} else {
					issues.push(`✗ Step "${step.name}" missing ${artifactType} artifact`);
				}
			}
		}

		const interviews = db
			.prepare(
				"SELECT COUNT(*) as total, SUM(CASE WHEN answer IS NOT NULL THEN 1 ELSE 0 END) as answered FROM interviews WHERE feature_id = ?",
			)
			.get(params.feature_id) as { total: number; answered: number };

		if (interviews.total > 0) {
			const unanswered = interviews.total - interviews.answered;
			if (unanswered > 0) {
				issues.push(`✗ ${unanswered} interview question(s) unanswered`);
			} else {
				passed.push(`✓ All ${interviews.total} interview questions answered`);
			}
		}

		if (params.checklist) {
			for (const item of params.checklist) {
				issues.push(`? [Manual check] ${item}`);
			}
		}

		const disciplineScores = evaluateDiscipline(artifacts, feature);

		const totalChecks = passed.length + issues.length;
		const score = totalChecks > 0 ? (passed.length / totalChecks) * 100 : 0;
		const disciplineOk = disciplineScores.overallDisciplineScore >= 0.6;
		const status =
			issues.length === 0 && disciplineOk
				? "PASS"
				: score >= 70 && disciplineOk
					? "WARN"
					: "FAIL";

		const report = [
			`## Review Gate: ${feature.title}`,
			`**Status:** ${status} (${Math.round(score)}% artifact coverage)`,
			"",
			"### Passed",
			...passed.map((p) => `  ${p}`),
			"",
			"### Issues",
			...(issues.length > 0
				? issues.map((i) => `  ${i}`)
				: ["  None — all checks passed!"]),
			formatDisciplineGate(disciplineScores),
		].join("\n");

		return {
			content: [{ type: "text" as const, text: report }],
			details: {
				status,
				score: Math.round(score),
				passed,
				issues,
				flowId: params.feature_id,
				disciplineScores,
			},
		};
	},
};
