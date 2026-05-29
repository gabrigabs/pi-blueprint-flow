# Blueprint Flow

Web cockpit for agentic development with [Pi coding agent](https://github.com/earendil-works/pi).

Blueprint Flow provides a structured workflow for feature development — from research and interviews through DDD modeling, behavior scenarios, and implementation — with a visual web UI for tracking progress.

## Features

- **10-step development flow**: intake → research → interview → spec → ddd → behavior → implementation_plan → implementation → review → memory_update
- **Web cockpit**: Real-time kanban board, artifact inspector, interview panel, and memory viewer
- **Persistent memory**: SQLite-backed project knowledge that persists across sessions
- **Adaptive interviews**: Context-aware questions that build understanding progressively
- **Repository research**: Deep codebase analysis before implementation
- **Artifact management**: Specs, models, scenarios, and code tracked per feature
- **Skills-based workflow**: Each step has a dedicated skill with detailed instructions

## Installation

```bash
pi install git:github.com/gabrigabs/pi-blueprint-flow
```

## Quick Start

```bash
# Initialize a new project
/blueprint:init

# Create a feature
/blueprint:feature Add user authentication with OAuth2

# Open the web cockpit
/blueprint:ui
```

> **Note:** The web cockpit requires a one-time build step. If `/blueprint:ui` reports that the web UI was not found, run:
>
> ```bash
> cd extensions/blueprint-flow/web
> npm install
> npm run build
> ```
>
> Then run `/blueprint:ui` again.

## Commands

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `/blueprint:init`      | Initialize a new project           |
| `/blueprint:ui`        | Open web cockpit (port 4377)       |
| `/blueprint:feature`   | Create a new feature               |
| `/blueprint:status`    | Show current flow state            |
| `/blueprint:advance`   | Advance to next step               |
| `/blueprint:artifacts` | List artifacts for current feature |
| `/blueprint:memory`    | Search project memory              |
| `/blueprint:interview` | Start/resume interview             |
| `/blueprint:research`  | Run repository research            |
| `/blueprint:review`    | Run review gate                    |
| `/blueprint:reset`     | Reset feature to a previous step   |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Development

```bash
# Clone the repo
git clone https://github.com/gabrigabs/pi-blueprint-flow.git
cd pi-blueprint-flow

# Install extension dependencies
cd extensions/blueprint-flow && npm install

# Build web UI (required for /blueprint:ui)
cd web && npm install && npm run build
cd ../../..

# Or use the root shortcut:
npm run build:web

# Run web UI in dev mode (with hot-reload via Vite proxy)
npm run dev:web

# Typecheck the extension source
npm run typecheck

# Install locally for development
pi install /path/to/pi-blueprint-flow
```

### Available Scripts

| Script              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `npm run build`     | Build the web UI (from root)                              |
| `npm run build:web` | Build the web UI (explicit)                               |
| `npm run dev:web`   | Start Vite dev server with HMR (proxies API to port 4377) |
| `npm run typecheck` | Run TypeScript type checking                              |

### Architecture Notes

- The extension source is loaded directly as TypeScript by Pi (no compilation step for the extension itself).
- The web UI is a separate React/Vite app that must be built to `extensions/blueprint-flow/web/dist/` before `/blueprint:ui` can serve it.
- In dev mode, run `npm run dev:web` for hot-reload and the Fastify server separately via `/blueprint:ui` — Vite proxies `/api` and `/ws` to port 4377.

## License

MIT
