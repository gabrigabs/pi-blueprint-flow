# Architecture

## Overview

Blueprint Flow is a Pi coding agent extension that provides a structured 10-step development workflow with a web-based cockpit for visualization and management.

```
┌─────────────────────────────────────────────────────────┐
│                    Pi Coding Agent                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Blueprint Flow Extension                │   │
│  │                                                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────────┐    │   │
│  │  │  Tools  │  │Commands │  │  Event Bus   │    │   │
│  │  │ (16)    │  │ (11)    │  │              │    │   │
│  │  └────┬────┘  └────┬────┘  └──────┬───────┘    │   │
│  │       │             │              │             │   │
│  │  ┌────▼─────────────▼──────────────▼───────┐    │   │
│  │  │              SQLite DB                    │    │   │
│  │  │  projects | features | steps | artifacts │    │   │
│  │  │  memories | interviews                   │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │         Fastify Server (:4377)           │    │   │
│  │  │  REST API + WebSocket + Static Files     │    │   │
│  │  └─────────────────┬───────────────────────┘    │   │
│  └────────────────────│──────────────────────────────┘   │
└───────────────────────│──────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Web Cockpit (React)                      │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Sidebar  │  │ Kanban Flow  │  │ Artifact Panel  │   │
│  │ Projects │  │ 10 Steps     │  │ Interview Panel │   │
│  │ Features │  │ Status       │  │                 │   │
│  └──────────┘  └──────────────┘  └─────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Memory Panel (bottom)                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Agent → Extension**: LLM calls tools (e.g., `blueprint_create_feature`)
2. **Extension → SQLite**: Tool persists data
3. **Extension → Event Bus**: Tool emits event (e.g., `feature:created`)
4. **Event Bus → WebSocket**: Server broadcasts to connected clients
5. **WebSocket → React**: UI updates in real-time

## Flow State Machine

```
intake → research → interview → spec → ddd → behavior → implementation_plan → implementation → review → memory_update
```

Each step has a status: `pending | running | needs_user | blocked | done | rejected`

Transitions:
- `blueprint_advance_step` — marks current as `done`, next as `running`
- `blueprint_reset_step` — resets target and all subsequent steps

## Extension Registration

The extension registers with Pi via the `pi` key in the root `package.json`:

```json
{
  "pi": {
    "extensions": ["./extensions/blueprint-flow/src/index.ts"],
    "skills": ["./skills/*/SKILL.md"]
  }
}
```

Pi discovers and loads the extension via `jiti` (TypeScript-aware module loader). Dependencies in `extensions/blueprint-flow/package.json` are resolved from that directory.

## SQLite Schema

- **projects** — Top-level containers
- **features** — Work items within a project, each with a flow
- **steps** — Individual flow steps per feature (10 per feature)
- **artifacts** — Outputs of each step (specs, models, scenarios, code)
- **memories** — Persistent project knowledge with FTS5 search
- **interviews** — Question/answer pairs per feature

## Web Server

Fastify serves:
- Static files from `web/dist/` (built React app)
- REST API at `/api/*` for data access
- WebSocket at `/ws` for real-time updates

The server starts on-demand via `/blueprint:ui` command.

## Skills

Seven skills guide the agent through each workflow step:
1. `blueprint-research` — Codebase analysis
2. `blueprint-interview` — Adaptive requirements gathering
3. `blueprint-spec` — Technical specification writing
4. `blueprint-ddd` — Domain modeling
5. `blueprint-behavior-scenarios` — BDD scenario writing
6. `blueprint-implementation` — Code implementation
7. `blueprint-review` — Quality gate

Skills are loaded on-demand when the agent's task matches the skill's triggers.
