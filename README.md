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

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Development

```bash
# Clone the repo
git clone https://github.com/gabrigabs/pi-blueprint-flow.git
cd pi-blueprint-flow

# Install extension dependencies
cd extensions/blueprint-flow && npm install

# Build web UI
cd web && npm install && npm run build

# Install locally for development
pi install /path/to/pi-blueprint-flow
```

## License

MIT
