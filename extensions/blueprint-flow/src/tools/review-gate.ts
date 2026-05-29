import { Type } from "@sinclair/typebox";
import { getDb } from "../db.js";
import type { Artifact, Feature, Step } from "../db.js";

export const reviewGateTool = {
  name: "blueprint_review_gate",
  label: "Blueprint: Review Gate",
  description:
    "Run a review gate check on a feature. Verifies that required artifacts exist for each completed step and produces a readiness report. Use before advancing to implementation or marking a feature as done.",
  parameters: Type.Object({
    feature_id: Type.String({ description: "Feature ID to review" }),
    checklist: Type.Optional(
      Type.Array(Type.String(), {
        description: "Custom checklist items to verify (in addition to standard checks)",
      })
    ),
  }),
  execute: async (
    _toolCallId: string,
    params: { feature_id: string; checklist?: string[] }
  ) => {
    const db = getDb();

    const feature = db
      .prepare("SELECT * FROM features WHERE id = ?")
      .get(params.feature_id) as Feature | undefined;

    if (!feature) {
      return {
        content: [{ type: "text" as const, text: `Feature "${params.feature_id}" not found.` }],
        details: { error: "feature_not_found" },
      };
    }

    const steps = db
      .prepare("SELECT * FROM steps WHERE feature_id = ? ORDER BY rowid")
      .all(params.feature_id) as Step[];

    const artifacts = db
      .prepare("SELECT * FROM artifacts WHERE feature_id = ?")
      .all(params.feature_id) as Artifact[];

    // Standard checks per step
    const expectedArtifacts: Record<string, string[]> = {
      spec: ["spec"],
      ddd: ["domain_model"],
      behavior: ["scenario"],
      implementation_plan: ["implementation_plan"],
      implementation: ["code"],
    };

    const issues: string[] = [];
    const passed: string[] = [];

    // Check completed steps have required artifacts
    for (const step of steps) {
      if (step.status !== "done") continue;

      const expected = expectedArtifacts[step.name];
      if (!expected) continue;

      for (const artifactType of expected) {
        const hasArtifact = artifacts.some(
          (a) => a.step_name === step.name && a.type === artifactType
        );
        if (hasArtifact) {
          passed.push(`✓ Step "${step.name}" has ${artifactType} artifact`);
        } else {
          issues.push(`✗ Step "${step.name}" missing ${artifactType} artifact`);
        }
      }
    }

    // Check interview coverage
    const interviews = db
      .prepare("SELECT COUNT(*) as total, SUM(CASE WHEN answer IS NOT NULL THEN 1 ELSE 0 END) as answered FROM interviews WHERE feature_id = ?")
      .get(params.feature_id) as { total: number; answered: number };

    if (interviews.total > 0) {
      const unanswered = interviews.total - interviews.answered;
      if (unanswered > 0) {
        issues.push(`✗ ${unanswered} interview question(s) unanswered`);
      } else {
        passed.push(`✓ All ${interviews.total} interview questions answered`);
      }
    }

    // Custom checklist
    if (params.checklist) {
      for (const item of params.checklist) {
        issues.push(`? [Manual check] ${item}`);
      }
    }

    const score = passed.length / (passed.length + issues.length) * 100;
    const status = issues.length === 0 ? "PASS" : score >= 70 ? "WARN" : "FAIL";

    const report = [
      `## Review Gate: ${feature.title}`,
      `**Status:** ${status} (${Math.round(score)}% complete)`,
      "",
      "### Passed",
      ...passed.map((p) => `  ${p}`),
      "",
      "### Issues",
      ...(issues.length > 0 ? issues.map((i) => `  ${i}`) : ["  None — all checks passed!"]),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: report }],
      details: { status, score: Math.round(score), passed, issues, featureId: params.feature_id },
    };
  },
};
