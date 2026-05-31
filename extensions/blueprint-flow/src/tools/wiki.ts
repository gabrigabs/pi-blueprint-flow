import { Type } from "@sinclair/typebox";
import { nanoid } from "nanoid";
import type { MemoryFact, WikiPage } from "../db.js";
import { getDb } from "../db.js";
import { bus } from "../events.js";

const WIKI_CATEGORIES = [
	"project_overview",
	"architecture",
	"domain_rules",
	"conventions",
	"testing_strategy",
	"integrations",
	"agent_instructions",
	"decisions",
	"known_pitfalls",
	"glossary",
] as const;

export const wikiUpsertPageTool = {
	name: "blueprint_wiki_upsert_page",
	label: "Blueprint: Wiki Upsert Page",
	description:
		"Create or update a wiki page for the project. Wiki pages are structured knowledge that persists across sessions. Categories: project_overview, architecture, domain_rules, conventions, testing_strategy, integrations, agent_instructions, decisions, known_pitfalls, glossary.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		slug: Type.String({
			description:
				"URL-friendly page identifier (e.g. 'architecture', 'auth-flow')",
		}),
		title: Type.String({ description: "Human-readable page title" }),
		category: Type.String({
			description: `Page category: ${WIKI_CATEGORIES.join(", ")}`,
		}),
		content_md: Type.String({
			description: "Full markdown content of the page",
		}),
		summary: Type.Optional(
			Type.String({ description: "One-line summary for search results" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			slug: string;
			title: string;
			category: string;
			content_md: string;
			summary?: string;
		},
	) => {
		const db = getDb();
		const now = new Date().toISOString().replace("T", " ").slice(0, 19);

		// Check if page exists for this project+slug
		const existing = db
			.prepare("SELECT id FROM wiki_pages WHERE project_id = ? AND slug = ?")
			.get(params.project_id, params.slug) as { id: string } | undefined;

		let pageId: string;

		if (existing) {
			pageId = existing.id;
			db.prepare(
				"UPDATE wiki_pages SET title = ?, category = ?, content_md = ?, summary = ?, updated_at = ? WHERE id = ?",
			).run(
				params.title,
				params.category,
				params.content_md,
				params.summary ?? null,
				now,
				pageId,
			);
		} else {
			pageId = nanoid(12);
			db.prepare(
				"INSERT INTO wiki_pages (id, project_id, slug, title, category, content_md, summary, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			).run(
				pageId,
				params.project_id,
				params.slug,
				params.title,
				params.category,
				params.content_md,
				params.summary ?? null,
				now,
			);
		}

		bus.emit("memory:saved", {
			id: pageId,
			workspaceId: params.project_id,
			category: params.category,
		});

		return {
			content: [
				{
					type: "text" as const,
					text: `Wiki page ${existing ? "updated" : "created"}: "${params.title}" [${params.category}] (slug: ${params.slug})`,
				},
			],
			details: {
				pageId,
				slug: params.slug,
				action: existing ? "updated" : "created",
			},
		};
	},
};

export const wikiSearchTool = {
	name: "blueprint_wiki_search",
	label: "Blueprint: Wiki Search",
	description:
		"Search wiki pages and memory facts for relevant project knowledge. Returns pages and facts matching the query.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		query: Type.String({ description: "Search query" }),
		category: Type.Optional(Type.String({ description: "Filter by category" })),
		limit: Type.Optional(
			Type.Number({ description: "Max results (default: 5)" }),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			query: string;
			category?: string;
			limit?: number;
		},
	) => {
		const db = getDb();
		const limit = params.limit ?? 5;
		const results: Array<{
			type: "page" | "fact";
			content: string;
			category: string;
			relevance: string;
		}> = [];

		// Search wiki pages (title + content LIKE match)
		const queryPattern = `%${params.query}%`;
		let pageSql = `SELECT * FROM wiki_pages WHERE project_id = ? AND (title LIKE ? OR content_md LIKE ? OR summary LIKE ?)`;
		const pageParams: (string | number)[] = [
			params.project_id,
			queryPattern,
			queryPattern,
			queryPattern,
		];

		if (params.category) {
			pageSql += " AND category = ?";
			pageParams.push(params.category);
		}
		pageSql += " ORDER BY updated_at DESC LIMIT ?";
		pageParams.push(limit);

		const pages = db.prepare(pageSql).all(...pageParams) as WikiPage[];

		for (const page of pages) {
			results.push({
				type: "page",
				content: `# ${page.title}\n${page.summary ?? page.content_md.slice(0, 200)}`,
				category: page.category,
				relevance: `wiki:${page.slug}`,
			});
		}

		// Search memory facts
		let factSql = `SELECT * FROM memory_facts WHERE project_id = ? AND fact LIKE ?`;
		const factParams: (string | number)[] = [params.project_id, queryPattern];

		if (params.category) {
			factSql += " AND category = ?";
			factParams.push(params.category);
		}
		factSql += " ORDER BY confidence DESC, updated_at DESC LIMIT ?";
		factParams.push(limit);

		const facts = db.prepare(factSql).all(...factParams) as MemoryFact[];

		for (const fact of facts) {
			results.push({
				type: "fact",
				content: fact.fact,
				category: fact.category,
				relevance: `fact:${fact.id}`,
			});
		}

		// Also search legacy memories table
		let memorySql = `SELECT * FROM memories WHERE project_id = ? AND content LIKE ?`;
		const memoryParams: (string | number)[] = [params.project_id, queryPattern];
		if (params.category) {
			memorySql += " AND category = ?";
			memoryParams.push(params.category);
		}
		memorySql += " ORDER BY created_at DESC LIMIT ?";
		memoryParams.push(limit);

		const memories = db.prepare(memorySql).all(...memoryParams) as Array<{
			id: string;
			category: string;
			content: string;
		}>;
		for (const mem of memories) {
			results.push({
				type: "fact",
				content: mem.content,
				category: mem.category,
				relevance: `memory:${mem.id}`,
			});
		}

		if (results.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No wiki pages or facts found matching the query.",
					},
				],
				details: { results: [] },
			};
		}

		const lines = results.map(
			(r) => `- [${r.type}/${r.category}] ${r.content.slice(0, 150)}`,
		);

		return {
			content: [
				{
					type: "text" as const,
					text: `Found ${results.length} results:\n\n${lines.join("\n")}`,
				},
			],
			details: { results },
		};
	},
};

export const memoryAddFactTool = {
	name: "blueprint_memory_add_fact",
	label: "Blueprint: Add Memory Fact",
	description:
		"Add a discrete fact to project memory. Facts are atomic pieces of knowledge linked to wiki pages. Use for decisions, constraints, patterns, and learnings.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		category: Type.String({
			description:
				"Fact category: decision, pattern, constraint, learning, convention, architecture, domain",
		}),
		fact: Type.String({
			description: "The fact to remember (specific and actionable)",
		}),
		page_slug: Type.Optional(
			Type.String({ description: "Wiki page slug to link this fact to" }),
		),
		confidence: Type.Optional(
			Type.Number({ description: "Confidence level 0-1 (default: 1.0)" }),
		),
		source_type: Type.Optional(
			Type.String({
				description: "Source type: feature, import, review, user, agent",
			}),
		),
		source_id: Type.Optional(
			Type.String({
				description: "Source ID (feature ID, import report ID, etc.)",
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			category: string;
			fact: string;
			page_slug?: string;
			confidence?: number;
			source_type?: string;
			source_id?: string;
		},
	) => {
		const db = getDb();
		const id = nanoid(12);

		// Resolve page_id from slug if provided
		let pageId: string | null = null;
		if (params.page_slug) {
			const page = db
				.prepare("SELECT id FROM wiki_pages WHERE project_id = ? AND slug = ?")
				.get(params.project_id, params.page_slug) as { id: string } | undefined;
			pageId = page?.id ?? null;
		}

		db.prepare(
			`INSERT INTO memory_facts (id, project_id, page_id, category, fact, confidence, source_type, source_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			id,
			params.project_id,
			pageId,
			params.category,
			params.fact,
			params.confidence ?? 1.0,
			params.source_type ?? null,
			params.source_id ?? null,
		);

		bus.emit("memory:saved", {
			id,
			workspaceId: params.project_id,
			category: params.category,
		});

		return {
			content: [
				{
					type: "text" as const,
					text: `Fact saved [${params.category}]: "${params.fact.slice(0, 80)}${params.fact.length > 80 ? "..." : ""}"`,
				},
			],
			details: { factId: id, category: params.category, pageId },
		};
	},
};

export const memoryRetrieveContextTool = {
	name: "blueprint_memory_retrieve_context",
	label: "Blueprint: Retrieve Context",
	description:
		"Retrieve relevant context from wiki and memory for a given intent. Returns curated knowledge with why_relevant explanations. Use before starting any step to load project context.",
	parameters: Type.Object({
		project_id: Type.String({ description: "Project ID" }),
		intent: Type.String({
			description:
				"What you're trying to do (e.g. 'implement auth', 'write tests for payment')",
		}),
		step_name: Type.Optional(
			Type.String({ description: "Current step name for filtering relevance" }),
		),
		max_tokens: Type.Optional(
			Type.Number({
				description: "Approximate max tokens to return (default: 2000)",
			}),
		),
	}),
	execute: async (
		_toolCallId: string,
		params: {
			project_id: string;
			intent: string;
			step_name?: string;
			max_tokens?: number;
		},
	) => {
		const db = getDb();
		const maxTokens = params.max_tokens ?? 2000;

		// Strategy: gather from multiple sources, prioritize by relevance
		const context: Array<{
			source: string;
			content: string;
			why_relevant: string;
		}> = [];
		let approxTokens = 0;
		const tokenBudget = maxTokens;

		// 1. Wiki pages — prioritize by category relevance to step
		const stepCategories = getRelevantCategories(params.step_name);
		const queryPattern = `%${params.intent.split(" ").slice(0, 3).join("%")}%`;

		// Get pages matching intent or relevant categories
		const pages = db
			.prepare(
				`SELECT * FROM wiki_pages WHERE project_id = ?
				 AND (title LIKE ? OR content_md LIKE ? OR category IN (${stepCategories.map(() => "?").join(",")}))
				 ORDER BY updated_at DESC LIMIT 5`,
			)
			.all(
				params.project_id,
				queryPattern,
				queryPattern,
				...stepCategories,
			) as WikiPage[];

		for (const page of pages) {
			if (approxTokens > tokenBudget) break;
			const snippet = page.summary ?? page.content_md.slice(0, 500);
			context.push({
				source: `wiki:${page.slug}`,
				content: `## ${page.title}\n${snippet}`,
				why_relevant: `${page.category} page — matches intent or step context`,
			});
			approxTokens += snippet.length / 4;
		}

		// 2. Memory facts — high confidence first
		const facts = db
			.prepare(
				`SELECT * FROM memory_facts WHERE project_id = ? AND fact LIKE ?
				 ORDER BY confidence DESC, updated_at DESC LIMIT 10`,
			)
			.all(params.project_id, queryPattern) as MemoryFact[];

		for (const fact of facts) {
			if (approxTokens > tokenBudget) break;
			context.push({
				source: `fact:${fact.id}`,
				content: `[${fact.category}] ${fact.fact}`,
				why_relevant: `${fact.category} fact (confidence: ${fact.confidence})`,
			});
			approxTokens += fact.fact.length / 4;
		}

		// 3. Legacy memories
		const memories = db
			.prepare(
				`SELECT * FROM memories WHERE project_id = ? AND content LIKE ?
				 ORDER BY created_at DESC LIMIT 5`,
			)
			.all(params.project_id, queryPattern) as Array<{
			id: string;
			category: string;
			content: string;
		}>;

		for (const mem of memories) {
			if (approxTokens > tokenBudget) break;
			context.push({
				source: `memory:${mem.id}`,
				content: `[${mem.category}] ${mem.content}`,
				why_relevant: `Legacy memory — ${mem.category}`,
			});
			approxTokens += mem.content.length / 4;
		}

		if (context.length === 0) {
			return {
				content: [
					{
						type: "text" as const,
						text: "No relevant context found in project memory.",
					},
				],
				details: { context: [], tokenEstimate: 0 },
			};
		}

		const formatted = context
			.map((c) => `### ${c.source}\n_Why: ${c.why_relevant}_\n\n${c.content}`)
			.join("\n\n---\n\n");

		return {
			content: [
				{
					type: "text" as const,
					text: `Retrieved ${context.length} context items (~${Math.round(approxTokens)} tokens):\n\n${formatted}`,
				},
			],
			details: { context, tokenEstimate: Math.round(approxTokens) },
		};
	},
};

function getRelevantCategories(stepName?: string): string[] {
	const base = ["project_overview", "conventions"];
	const stepMap: Record<string, string[]> = {
		research: ["architecture", "integrations", "known_pitfalls"],
		interview: ["domain_rules", "decisions"],
		spec: ["architecture", "domain_rules", "decisions"],
		ddd: ["domain_rules", "glossary", "architecture"],
		behavior: ["domain_rules", "testing_strategy"],
		implementation_plan: ["architecture", "conventions", "integrations"],
		implementation: ["architecture", "conventions", "known_pitfalls"],
		review: ["conventions", "testing_strategy", "known_pitfalls"],
		memory_update: ["decisions", "known_pitfalls"],
	};
	return [...base, ...(stepMap[stepName ?? ""] ?? [])];
}
