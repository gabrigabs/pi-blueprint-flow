# Blueprint Flow

Web cockpit for agentic development with [Pi coding agent](https://github.com/earendil-works/pi).

Blueprint Flow provides a structured workflow for feature development — from research and interviews through DDD modeling, behavior scenarios, and implementation — with a visual web UI for tracking progress.

## Features

- **10-step development flow**: intake → research → interview → spec → ddd → behavior → implementation_plan → implementation → review → memory_update
- **Operational web cockpit**: Create projects, features, and tasks directly from the UI
- **Agent Run Settings**: Choose model, effort level, and execution mode before running any action
- **Project import**: Analyze existing repositories, detect stack, and find agentic configuration files
- **Persistent memory**: SQLite-backed project knowledge that persists across sessions
- **Adaptive interviews**: Context-aware questions that build understanding progressively
- **Repository research**: Deep codebase analysis before implementation
- **Artifact management**: Specs, models, scenarios, and code tracked per feature
- **Coding discipline**: Enforced principles — think before coding, simplicity first, surgical changes
- **Review gate with discipline scoring**: Automated quality checks with coding discipline evaluation
- **Real-time updates**: WebSocket-powered live UI updates
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

## Web Cockpit

The web cockpit (port 4377) is the operational center for Blueprint Flow:

### Projects
- Create new projects with name, repo path, description, and stack
- Import existing projects with automatic stack detection
- Edit and archive projects

### Features / Tasks
- Create features with type, priority, and risk level
- Types: `feature`, `bugfix`, `refactor`, `spike`, `research`, `maintenance`
- Each feature gets the full 10-step development flow

### Agent Run Settings
Before executing any action, configure:
- **Model**: Select or type a model identifier
- **Effort level**: `fast` | `balanced` | `deep` | `max`
- **Execution mode**: `draft` | `review` | `apply`
- **Options**: Memory search, repo scan, web research toggles

### Effort Levels

| Level | Use Case | Research | Interview | Review |
|-------|----------|----------|-----------|--------|
| Fast | Simple tasks, low risk | 3 results | 2 questions | Light |
| Balanced | Standard features | 5 results | 5 questions | Normal |
| Deep | Complex logic, integrations | 10 results | 8 questions | Strict |
| Max | Architecture, migrations, critical | 15 results | 12 questions | Strict |

### Project Import
Import existing repositories with:
- Stack detection (languages, frameworks, build tools, test frameworks)
- Script detection from package.json
- Agentic file detection (AGENTS.md, CLAUDE.md, .cursor/rules, etc.)
- Project profile generation
- Safe scanning with path validation and size limits

## Commands

| Command | Description |
|---------|-------------|
| `/blueprint:init` | Initialize a new project |
| `/blueprint:ui` | Open web cockpit (port 4377) |
| `/blueprint:feature` | Create a new feature |
| `/blueprint:status` | Show current flow state |
| `/blueprint:advance` | Advance to next step |
| `/blueprint:artifacts` | List artifacts for current feature |
| `/blueprint:memory` | Search project memory |
| `/blueprint:interview` | Start/resume interview |
| `/blueprint:research` | Run repository research |
| `/blueprint:review` | Run review gate |
| `/blueprint:reset` | Reset feature to a previous step |

## REST API

### Read Endpoints
```
GET  /api/projects
GET  /api/projects/:id
GET  /api/projects/:projectId/features
GET  /api/features/:id
GET  /api/features/:featureId/steps
GET  /api/features/:featureId/artifacts
GET  /api/features/:featureId/interviews
GET  /api/features/:featureId/settings
GET  /api/projects/:projectId/memories
GET  /api/artifacts/:id
GET  /api/import-reports/:id
```

### Write Endpoints
```
POST   /api/projects
PATCH  /api/projects/:id
POST   /api/projects/import
POST   /api/projects/:projectId/features
PATCH  /api/features/:id
POST   /api/features/:id/advance
POST   /api/features/:id/back
POST   /api/features/:id/run-step
PATCH  /api/steps/:id/status
POST   /api/artifacts
PATCH  /api/artifacts/:id
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Skills

Eight skills guide the agent through the workflow:

1. **blueprint-research** — Codebase analysis
2. **blueprint-interview** — Adaptive requirements gathering
3. **blueprint-spec** — Technical specification writing
4. **blueprint-ddd** — Domain modeling
5. **blueprint-behavior-scenarios** — BDD scenario writing
6. **blueprint-implementation** — Code implementation
7. **blueprint-review** — Quality gate
8. **blueprint-coding-discipline** — Enforced coding principles

### Coding Discipline

The coding discipline skill enforces five principles:

1. **Think Before Coding** — Declare assumptions, identify ambiguities, plan first
2. **Simplicity First** — No overengineering, no premature abstractions
3. **Surgical Changes** — Only modify what's necessary
4. **Goal-Driven Execution** — Clear objectives and acceptance criteria
5. **Verification Discipline** — Validate before declaring done

The review gate automatically scores these dimensions and flags violations.

## Development

```bash
# Clone the repo
git clone https://github.com/gabrigabs/pi-blueprint-flow.git
cd pi-blueprint-flow

# Install dependencies
npm install

# Build web UI
npm run build:web

# Run web UI in dev mode (with hot-reload via Vite proxy)
npm run dev:web

# Typecheck the extension source
npm run typecheck

# Install locally for development
pi install /path/to/pi-blueprint-flow
```

## Security

The import and repo scan features include:
- Path traversal prevention (realpath validation)
- Blocked patterns: `.env`, `.pem`, `.key`, `node_modules`, `.git`, `dist`, `coverage`, `.next`
- File size limits (50KB per file)
- Scan limits (100 files max)
- No file modification without explicit approval
- All migrations require dry-run first

## License

MIT
