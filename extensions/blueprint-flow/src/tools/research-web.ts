import { Type } from "@sinclair/typebox";
import {
  WEB_FETCH_MAX_SIZE,
  WEB_SEARCH_CACHE_TTL,
  WEB_SEARCH_TIMEOUT_MS,
} from "../config.js";

interface CacheEntry {
  text: string;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

function getCached(key: string): string | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > WEB_SEARCH_CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.text;
}

function setCache(key: string, text: string) {
  searchCache.set(key, { text, timestamp: Date.now() });
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return false;
    if (host.startsWith("169.254.") || host.startsWith("10.") || host.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host.endsWith(".local") || host === "0.0.0.0") return false;
    return true;
  } catch {
    return false;
  }
}

function safeDecodeURI(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function parseDuckDuckGoResults(html: string, maxResults: number): string {
  const results: string[] = [];
  const blockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null && results.length < maxResults) {
    const url = match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "").split("&")[0];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match[3].replace(/<[^>]+>/g, "").trim();
    if (title && url) {
      results.push(`${title}\n${safeDecodeURI(url)}\n${snippet}`);
    }
  }

  if (results.length === 0) {
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
      const url = match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "").split("&")[0];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      if (title && url) {
        results.push(`${title}\n${safeDecodeURI(url)}`);
      }
    }
  }

  return results.length > 0
    ? results.join("\n\n---\n\n")
    : "No results found.";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readStreamLimited(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    return new TextDecoder().decode(buffer.slice(0, maxBytes));
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (totalBytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalBytes += value.length;
  }

  reader.cancel();

  const merged = new Uint8Array(Math.min(totalBytes, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = maxBytes - offset;
    const slice = chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
    merged.set(slice, offset);
    offset += slice.length;
    if (offset >= maxBytes) break;
  }

  return new TextDecoder().decode(merged);
}

export const researchWebTool = {
  name: "blueprint_research_web",
  label: "Blueprint: Research Web",
  description:
    "Search the web or fetch a URL for documentation, patterns, and best practices relevant to a feature.",
  parameters: Type.Object({
    mode: Type.String({ description: "'search' | 'fetch'" }),
    query: Type.Optional(Type.String({ description: "Search query (for search mode)" })),
    url: Type.Optional(Type.String({ description: "URL to fetch (for fetch mode)" })),
    max_results: Type.Optional(Type.Number({ default: 5 })),
  }),
  execute: async (
    _toolCallId: string,
    params: { mode: string; query?: string; url?: string; max_results?: number },
  ) => {
    const maxResults = params.max_results ?? 5;

    if (params.mode === "fetch") {
      if (!params.url) {
        return {
          content: [{ type: "text" as const, text: "URL required for fetch mode" }],
        };
      }

      if (!validateUrl(params.url)) {
        return {
          content: [{ type: "text" as const, text: "URL rejected: only public http/https URLs are allowed" }],
        };
      }

      const cacheKey = `fetch:${params.url}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return {
          content: [{ type: "text" as const, text: cached }],
          details: { url: params.url, cached: true },
        };
      }

      try {
        const response = await fetch(params.url, {
          signal: AbortSignal.timeout(WEB_SEARCH_TIMEOUT_MS),
          headers: { "User-Agent": "BlueprintFlow/1.0 (research tool)" },
        });
        if (!response.ok) {
          return {
            content: [{ type: "text" as const, text: `Fetch failed: HTTP ${response.status} ${response.statusText}` }],
            details: { url: params.url, status: response.status },
          };
        }
        const raw = await readStreamLimited(response, WEB_FETCH_MAX_SIZE);
        const text = stripHtml(raw).slice(0, WEB_FETCH_MAX_SIZE);
        setCache(cacheKey, text);
        return {
          content: [{ type: "text" as const, text }],
          details: { url: params.url, length: text.length },
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Fetch failed: ${err.message}` }],
          details: { url: params.url, error: err.message },
        };
      }
    }

    if (params.mode === "search") {
      if (!params.query) {
        return {
          content: [{ type: "text" as const, text: "Query required for search mode" }],
        };
      }

      const cacheKey = `search:${params.query}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return {
          content: [{ type: "text" as const, text: cached }],
          details: { query: params.query, cached: true },
        };
      }

      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`;
        const response = await fetch(searchUrl, {
          signal: AbortSignal.timeout(WEB_SEARCH_TIMEOUT_MS),
          headers: { "User-Agent": "BlueprintFlow/1.0 (research tool)" },
        });
        const html = await response.text();
        const results = parseDuckDuckGoResults(html, maxResults);
        setCache(cacheKey, results);
        return {
          content: [{ type: "text" as const, text: results }],
          details: { query: params.query, resultCount: results.split("---").length },
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `Search failed: ${err.message}` }],
          details: { query: params.query, error: err.message },
        };
      }
    }

    return {
      content: [{ type: "text" as const, text: `Invalid mode: "${params.mode}". Use 'search' or 'fetch'.` }],
    };
  },
};
