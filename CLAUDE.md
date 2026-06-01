# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build everything (backend + frontend)
npm run build

# Frontend dev server (hot reload, proxies API to :4377)
npm run dev:web

# Build frontend only
npm run build:web

# Typecheck backend (from root)
npx tsc --noEmit

# Typecheck frontend
cd extensions/blueprint-flow/web && npx tsc -b
```

No test framework or linter is configured.

## Architecture

Blueprint Flow is a **Pi coding agent extension** with a local web cockpit. Two layers:

1. **Extension backend** (`extensions/blueprint-flow/src/`) — registers 16 tools and 11 commands with the Pi agent runtime. Runs a Fastify server on localhost:4377 serving REST API, WebSocket, and static files.

2. **Web cockpit** (`extensions/blueprint-flow/web/src/`) — React 19 SPA rendered as a node-graph canvas (React Flow). No client-side router; views switch based on Zustand state.

### Data flow

```
Pi agent calls tool → SQLite write → event bus emit → WebSocket broadcast → Zustand update → React re-render
```

### Extension registration

Pi discovers the extension via the `pi` key in root `package.json`. The entry point (`src/index.ts`) registers tools, commands, and lifecycle hooks. Pi loads it with `jiti` (TS-aware loader) — no compile step needed for the backend during development.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | TypeScript, Fastify 5, better-sqlite3, WebSocket |
| Frontend | React 19, Zustand 5, @xyflow/react 12, Tailwind CSS v4, Lucide icons |
| Build | Vite 6 (frontend), ESM throughout |
| Data | SQLite with FTS5 for memory search |

## Key Directories

- `extensions/blueprint-flow/src/` — Backend: server, DB, routes, services, tools
- `extensions/blueprint-flow/src/routes/` — Fastify REST route handlers
- `extensions/blueprint-flow/src/services/` — Business logic (subagent execution, prompt building, detection)
- `extensions/blueprint-flow/src/tools/` — Pi agent tool implementations
- `extensions/blueprint-flow/web/src/` — Frontend React app
- `extensions/blueprint-flow/web/src/store.ts` — Single Zustand store (all app state)
- `extensions/blueprint-flow/web/src/lib/api.ts` — Typed REST client wrapping fetch()
- `extensions/blueprint-flow/web/src/components/canvas/` — React Flow workflow canvas
- `skills/` — Agent skill definitions (SKILL.md files) and agent profiles (`agents/`)
- `types/pi-coding-agent.d.ts` — Ambient type declarations for Pi extension API

## Domain Model

- **Workspace** — project container (maps to a repo)
- **Flow** — unit of work (feature, bugfix, refactor, spike, research, maintenance) progressing through ordered steps
- **Step** — individual phase with status: `pending | current | running | needs_user | blocked | done | rejected`
- **Artifact** — output of a step (specs, domain models, scenarios, code)
- **ActionRun** — tracks execution of an agent action with streaming events
- **Interview** — adaptive Q&A for requirements gathering
- **Memory/Wiki** — persistent project knowledge with full-text search

### Flow step pipeline

```
intake → research → interview → spec → ddd → design → behavior → implementation_plan → implementation → review → memory_update
```

Each flow type uses a subset of these steps (defined in `WORKFLOW_TEMPLATES` in `src/config.ts`).

## Conventions

- All modules are ESM (`"type": "module"`)
- Frontend uses custom UI components — no shadcn, MUI, or Radix
- Theming via CSS custom properties (`--bg-base`, `--accent-primary`, etc.) defined in `web/src/index.css`
- State-driven navigation (no react-router): `selectedFlowId` determines which view renders
- WebSocket hook (`useWebSocket.ts`) handles reconnection with exponential backoff and dispatches directly to Zustand
- Backend data directory: `~/.pi/blueprint-flow/` (SQLite DB, artifacts, wiki, logs)
- Server port: 4377 (configurable via `BLUEPRINT_DATA_DIR` and `BLUEPRINT_WEB_DIST` env vars)
