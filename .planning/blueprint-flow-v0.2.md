# Blueprint Flow v0.2 — Plano de Implementação

> Gerado após análise do código, pesquisa do Pi SDK, extensões similares, e melhores práticas UI/UX.
> Data: 2026-05-29

---

## Sumário

- [Fase 1: Server Persistente](#fase-1-server-persistente--30min)
- [Fase 2: Interview 2.0 (Não-Bloqueante)](#fase-2-interview-20-não-bloqueante--2h)
- [Fase 3: Canvas Workflows (React Flow)](#fase-3-canvas-workflows-react-flow--6h)
- [Fase 4: Sub-agentes Isolados por Step](#fase-4-sub-agentes-isolados-por-step--8h)
- [Fase 5: Step Design — Mockups + A/B Testing](#fase-5-step-design--mockups--ab-testing--5h)
- [Referências e Pesquisas](#referências-e-pesquisas)

---

## Fase 1: Server Persistente — 🔵 ~30min

### Problema

O `index.ts` atual desliga o servidor Fastify no evento `agent_end`:

```typescript
// index.ts:71-75
pi.on("agent_end", async () => {
  await stopServer();
  closeDb();
  bus.removeAll();
});
```

`agent_end` dispara a **cada turno do agente Pi**. Quando o Pi termina de executar um step (ex: research), o servidor morre. O usuário perde a conexão WebSocket e precisa rodar `/blueprint:ui` de novo.

### Eventos do Pi SDK

Da doc `extensions.md` e types `pi-coding-agent.d.ts`:

| Evento                            | Dispara quando                        |
| --------------------------------- | ------------------------------------- |
| `session_start`                   | Sessão do Pi inicia                   |
| `session_end`                     | Sessão do Pi termina (usuário sai)    |
| `agent_start`                     | Agente começa a processar um prompt   |
| `agent_end`                       | Agente termina de processar um prompt |
| `turn_start` / `turn_end`         | Cada turno dentro de uma execução     |
| `tool_execution_start/update/end` | Ciclo de tool call                    |

### Mudança Exata

**Arquivo:** `extensions/blueprint-flow/src/index.ts:71-75`

```typescript
// ANTES:
pi.on("agent_end", async () => {
  await stopServer(); // ← remove
  closeDb();
  bus.removeAll();
});

// DEPOIS:
pi.on("agent_end", async () => {
  // Não desliga o server — ele persiste entre turnos do agente
  // Apenas registra fim do turno
});

// NOVO: desligamento só no fim da sessão
pi.on("session_end", async () => {
  await stopServer();
  closeDb();
  bus.removeAll();
});
```

### WebSocket Recovery

O hook `useWebSocket.ts` já implementa reconnect com exponential backoff:

- INITIAL_RETRY_MS = 1000
- MAX_RETRY_MS = 30_000
- BACKOFF_FACTOR = 2
- Heartbeat ping/pong a cada 30s

Com o server persistente, o WebSocket nunca desconecta entre turnos.

---

## Fase 2: Interview 2.0 (Não-Bloqueante) — 🟡 ~2h

### Problema

O fluxo atual:

1. LLM chama `blueprint_ask_interview({ question, type, why })`
2. Tool insere pergunta no DB, emite `interview:asked`
3. Tool chama `ctx.ui.input(question)` — **BLOQUEIA** esperando input no terminal
4. Usuário precisa digitar no terminal do Pi (não na UI web)
5. Quando responde, tool armazena, emite `interview:answered`

**Dois problemas:**

1. `ctx.ui.input()` é bloqueante — a tool espera terminal, não UI
2. A UI já responde via `POST /api/interviews/:id/answer`, mas a tool não sabe

O SKILL.md não exige opções — perguntas são free-form sem alternativas.

### Arquivos Afetados

| Arquivo                                                                   | Tipo  | Mudança                                                                        |
| ------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| `extensions/blueprint-flow/src/tools/interview.ts`                        | Tool  | `blueprint_ask_interview` não-bloqueante + nova `blueprint_wait_for_interview` |
| `skills/blueprint-interview/SKILL.md`                                     | Skill | Adicionar `response_type` + `options` no schema                                |
| `extensions/blueprint-flow/web/src/components/InlineInterviewSection.tsx` | UI    | Radio/checkbox + textarea (fallback)                                           |
| `extensions/blueprint-flow/src/db.ts`                                     | DB    | Adicionar colunas `response_type` e `options`                                  |
| `extensions/blueprint-flow/web/src/store.ts`                              | Store | Tipos `Interview` atualizados                                                  |

### Mudança 1: Tool Não-Bloqueante

**`tools/interview.ts`** — Schema da tool com opções:

```typescript
parameters: Type.Object({
    feature_id: Type.String(),
    question: Type.String(),
    type: Type.String(),
    why: Type.Optional(Type.String()),
    required: Type.Optional(Type.Boolean()),
    // NOVOS CAMPOS
    response_type: Type.Optional(Type.String({
        description: "free_text | single_choice | multi_choice"
    })),
    options: Type.Optional(Type.Array(Type.String(), {
        description: "Predefined options for single_choice or multi_choice"
    })),
}),
```

**Comportamento da execute:**

1. Inserir pergunta no DB (já existe)
2. Emitir `interview:asked` (já existe)
3. Setar step como `needs_user`
4. **NÃO** chamar `ctx.ui.input()` — retornar imediatamente

### Mudança 2: Nova Tool `blueprint_wait_for_interview`

Tool de polling que substitui o `ctx.ui.input()` bloqueante:

```typescript
export const waitForInterviewTool = {
  name: "blueprint_wait_for_interview",
  description: "Wait for interview answers via Blueprint UI",
  parameters: Type.Object({
    feature_id: Type.String(),
    timeout_ms: Type.Optional(Type.Number({ default: 60000 })),
  }),
  execute: async (_toolCallId, params, _signal) => {
    const db = getDb();
    const start = Date.now();

    while (Date.now() - start < params.timeout_ms) {
      const pending = db
        .prepare(
          "SELECT COUNT(*) as count FROM interviews WHERE feature_id = ? AND required = 1 AND answer IS NULL",
        )
        .get(params.feature_id) as { count: number };

      if (pending.count === 0) {
        const all = db
          .prepare(
            "SELECT * FROM interviews WHERE feature_id = ? ORDER BY created_at ASC",
          )
          .all(params.feature_id) as Interview[];
        return {
          content: [{ type: "text", text: formatInterviewSummary(all) }],
          details: { interviews: all },
        };
      }

      if (params.signal?.aborted) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Timeout — retorna o que temos
    const current = db
      .prepare(
        "SELECT * FROM interviews WHERE feature_id = ? ORDER BY created_at ASC",
      )
      .all(params.feature_id) as Interview[];
    return {
      content: [
        {
          type: "text",
          text: `Timeout. ${current.filter((i) => !i.answer).length} unanswered.`,
        },
      ],
      details: { interviews: current, timedOut: true },
    };
  },
};
```

### Mudança 3: SKILL.md Atualizado

**`skills/blueprint-interview/SKILL.md`** — Nova seção:

```markdown
## Response Types

- **free_text** — Open input (default). Use for open-ended questions.
- **single_choice** — User picks exactly one option. Provide `options: ["A", "B"]`.
- **multi_choice** — User picks multiple options. Provide `options: ["A", "B"]`.

### Example:
```

blueprint_ask_interview({
feature_id: "...",
question: "Which auth method?",
type: "technical",
response_type: "single_choice",
options: ["JWT", "Session cookies", "OAuth 2.0", "API Keys"],
required: true
})

```

### Process (Updated)
1. Ask all questions using `blueprint_ask_interview` WITHOUT blocking
2. After all questions asked, call `blueprint_wait_for_interview`
3. When answers arrive, advance to spec step
```

### Mudança 4: UI — Opções Visuais

**`InlineInterviewSection.tsx`** — Novos modos de resposta:

```tsx
// single_choice: render as buttons
{interview.response_type === "single_choice" && interview.options && (
    <div className="flex flex-col gap-1.5 mt-2">
        {interview.options.map((opt, i) => (
            <button
                key={i}
                onClick={() => { setAnswer(opt); handleSubmit(opt); }}
                className="text-left rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm hover:border-amber-600"
            >
                <span className="text-amber-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
            </button>
        ))}
    </div>
)}

// multi_choice: render as checkboxes
{interview.response_type === "multi_choice" && interview.options && (
    <div className="flex flex-col gap-1.5 mt-2">
        {interview.options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-3 py-2 cursor-pointer hover:border-amber-600">
                <input type="checkbox" checked={selectedOptions.includes(opt)} onChange={() => toggleOption(opt)} className="accent-amber-500" />
                {opt}
            </label>
        ))}
        <button onClick={handleMultiSubmit} disabled={selectedOptions.length === 0}
            className="mt-1 rounded bg-amber-600/20 px-3 py-1.5 text-xs text-amber-300">
            Submit ({selectedOptions.length})
        </button>
    </div>
)}

// free_text: fallback textarea (comportamento atual)
{(!interview.response_type || interview.response_type === "free_text") && (
    <textarea ... />
)}
```

### Mudança 5: DB e Store

**`db.ts`** — Migração das colunas:

```sql
ALTER TABLE interviews ADD COLUMN response_type TEXT DEFAULT 'free_text';
ALTER TABLE interviews ADD COLUMN options TEXT; -- JSON array stored as string
```

**`store.ts`** — Tipos atualizados:

```typescript
export interface Interview {
  id: string;
  feature_id: string;
  question: string;
  answer: string | null;
  type: string;
  required: number;
  response_type?: string; // "free_text" | "single_choice" | "multi_choice"
  options?: string[]; // parsed from JSON in DB
  why: string | null;
  created_at: string;
}
```

---

## Fase 3: Canvas Workflows (React Flow) — 🔴 ~6h

### Contexto

`VerticalKanban.tsx` é uma timeline linear de 10 steps fixos. `CanvasBoard.tsx` é placeholder vazio.

### Pesquisa

| Recurso                             | Insight                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **React Flow 12** (`@xyflow/react`) | Server-side support, TypeScript melhorado, dark mode nativo, viewport culling automático                                        |
| **ByteChef blog**                   | Structural fingerprinting para evitar re-layout desnecessário, `useShallow` + `memo` contra re-renders, viewport culling gratis |
| **React Flow tips (Medium)**        | Tratar diagrama como estado (não UI), nodes são "dumb", sidebar editing, export pipeline                                        |
| **React Flow skill (github)**       | Setup, performance, state, types — patterns compilados                                                                          |
| **Dev.to workflow builder**         | ELK.js/Dagre para auto-layout, estrutura de projeto, separação visual state vs business logic                                   |

### Princípios de Arquitetura

1. **Nodes são dumb** — Renderizam dados, não gerenciam comportamento. State fica em Zustand.
2. **Sidebar editing** — Configuração do node selecionado num painel, não inline no node
3. **Auto-layout com ELK.js** — Posições gerenciadas pelo algoritmo, não manual
4. **Structural fingerprinting** — Só re-layout quando estrutura do workflow muda (add/remove step)
5. **memo + useShallow** — Previne cascading re-renders (referência ByteChef)

### Novas Dependências

```json
// extensions/blueprint-flow/web/package.json
{
  "dependencies": {
    "@xyflow/react": "^12.4.0",
    "elkjs": "^0.9.3"
  }
}
```

### Arquivos

| Arquivo                                  | Tipo      | Descrição                                                  |
| ---------------------------------------- | --------- | ---------------------------------------------------------- | ----------------------- |
| `components/WorkflowCanvas.tsx`          | Novo      | Componente principal React Flow                            |
| `components/canvas/WorkflowStepNode.tsx` | Novo      | Custom node — ícone, label, status, badges                 |
| `components/canvas/WorkflowEdge.tsx`     | Novo      | Custom edge — animação + cor por status                    |
| `components/canvas/layout.ts`            | Novo      | `stepsToNodes()`, `stepsToEdges()`, `autoLayout()` com ELK |
| `components/canvas/NodeSidebar.tsx`      | Novo      | Sidebar editing do node selecionado                        |
| `store.ts`                               | Modificar | `viewMode: "kanban"                                        | "canvas"` + setViewMode |
| `App.tsx`                                | Modificar | Toggle button + render condicional                         |
| `config.ts`                              | Modificar | WORKFLOW_TEMPLATES + PROJECT_SCOPES                        |
| `types.ts`                               | Modificar | ProjectScope type                                          |
| `db.ts`                                  | Modificar | scope column on projects                                   |
| `WorkflowEditor.tsx`                     | Modificar | Migrar para drag-and-drop visual                           |

### Componente Principal

**`components/WorkflowCanvas.tsx`:**

```tsx
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodeTypes = { workflowStep: WorkflowStepNode };
const edgeTypes = { workflowEdge: WorkflowEdge };

export function WorkflowCanvas() {
  const { steps, artifacts, selectedFeatureId } = useStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Converter steps -> nodes/edges quando steps mudam
  useEffect(() => {
    const n = stepsToNodes(steps, artifacts);
    const e = stepsToEdges(steps);
    setNodes(n);
    setEdges(e);
    autoLayout(n, e).then(({ nodes: layouted }) => setNodes(layouted));
  }, [steps.length, steps.map((s) => s.status).join(",")]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.1}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      zoomOnScroll={false}
      panOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls showZoom showFitView position="bottom-right" />
      <MiniMap position="bottom-left" pannable zoomable />
    </ReactFlow>
  );
}
```

### Custom Node

**`components/canvas/WorkflowStepNode.tsx`:**

```tsx
const statusColors = {
  done: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
  },
  running: {
    bg: "bg-cyan-950/40",
    border: "border-cyan-500/50",
    text: "text-cyan-300",
  },
  needs_user: {
    bg: "bg-amber-950/40",
    border: "border-amber-500/40",
    text: "text-amber-300",
  },
  blocked: {
    bg: "bg-rose-950/40",
    border: "border-rose-500/30",
    text: "text-rose-300",
  },
  pending: {
    bg: "bg-zinc-900/40",
    border: "border-zinc-700/30",
    text: "text-zinc-500",
  },
  rejected: {
    bg: "bg-rose-950/30",
    border: "border-rose-500/20",
    text: "text-rose-400",
  },
};

function WorkflowStepNodeComponent({ data }: NodeProps) {
  const { label, status, artifactCount, isCurrentStep } = data;
  const colors = statusColors[status] || statusColors.pending;

  return (
    <div
      className={`rounded-xl border px-4 py-3 min-w-[200px] ${colors.bg} ${colors.border} ${isCurrentStep ? "ring-1 ring-amber-400/30" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-600" />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <StatusPill status={status} />
        {artifactCount > 0 && (
          <span className="text-[10px] text-zinc-500 font-mono">
            {artifactCount} artifacts
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-600"
      />
    </div>
  );
}

export const WorkflowStepNode = memo(WorkflowStepNodeComponent);
```

### Layout

**`components/canvas/layout.ts`:**

```typescript
import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export function stepsToNodes(steps, artifacts) {
  return steps.map((step, index) => ({
    id: step.id,
    type: "workflowStep",
    position: { x: 0, y: index * 120 },
    data: {
      label: STEP_LABELS[step.name] || step.name,
      status: step.status,
      artifactCount: artifacts.filter((a) => a.step_name === step.name).length,
      isCurrentStep: step.status === "running" || step.status === "needs_user",
    },
  }));
}

export function stepsToEdges(steps) {
  return steps.slice(0, -1).map((step, i) => ({
    id: `e-${step.id}-${steps[i + 1].id}`,
    source: step.id,
    target: steps[i + 1].id,
    type: "smoothstep",
    animated: step.status === "done" || step.status === "running",
    style: {
      stroke: step.status === "done" ? "#10b981" : "#374151",
      strokeWidth: 2,
    },
  }));
}

export async function autoLayout(nodes, edges) {
  const graph = {
    id: "workflow-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
    },
    children: nodes.map((n) => ({ id: n.id, width: 240, height: 100 })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);

  return {
    nodes: nodes.map((n) => {
      const child = layout.children?.find((c) => c.id === n.id);
      if (child?.x != null && child?.y != null) {
        return { ...n, position: { x: child.x, y: child.y } };
      }
      return n;
    }),
  };
}
```

### Toggle View na Store

**`web/src/store.ts`:**

```typescript
export type ViewMode = "kanban" | "canvas";

interface BlueprintStore {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

// No create():
viewMode: "kanban" as ViewMode,
setViewMode: (viewMode) => set({ viewMode }),
```

### Toggle View no App.tsx

**`web/src/App.tsx`** — No header:

```tsx
import { BetweenVerticalEnd, GitGraph } from "lucide-react";

<div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
  <button
    onClick={() => setViewMode("kanban")}
    className={`rounded-md p-1.5 transition-colors ${
      viewMode === "kanban"
        ? "bg-zinc-700 text-amber-400"
        : "text-zinc-500 hover:text-zinc-300"
    }`}
    title="Timeline View [K]"
  >
    <BetweenVerticalEnd size={14} />
  </button>
  <button
    onClick={() => setViewMode("canvas")}
    className={`rounded-md p-1.5 transition-colors ${
      viewMode === "canvas"
        ? "bg-zinc-700 text-amber-400"
        : "text-zinc-500 hover:text-zinc-300"
    }`}
    title="Canvas View [C]"
  >
    <GitGraph size={14} />
  </button>
</div>;
```

Na área central:

```tsx
{
  selectedFeatureId ? (
    viewMode === "kanban" ? (
      <VerticalKanban />
    ) : (
      <WorkflowCanvas />
    )
  ) : null;
}
```

### Workflow Templates

**`extensions/blueprint-flow/src/config.ts`:**

```typescript
export const WORKFLOW_TEMPLATES: Record<string, readonly string[]> = {
  feature: [
    "intake",
    "research",
    "interview",
    "spec",
    "ddd",
    "design",
    "behavior",
    "implementation_plan",
    "implementation",
    "review",
    "memory_update",
  ],
  bugfix: [
    "intake",
    "research",
    "spec",
    "implementation",
    "review",
    "memory_update",
  ],
  refactor: ["intake", "spec", "implementation", "review", "memory_update"],
  spike: ["intake", "research", "memory_update"],
  research: ["intake", "research", "memory_update"],
  maintenance: ["intake", "implementation", "review", "memory_update"],
};

export const PROJECT_SCOPES = [
  "app",
  "electron_app",
  "website",
  "portfolio",
  "library",
  "cli",
  "api",
] as const;

export type ProjectScope = (typeof PROJECT_SCOPES)[number];

export const PROJECT_SCOPE_TEMPLATES: Record<string, string> = {
  app: "feature",
  electron_app: "feature",
  website: "feature",
  portfolio: "feature",
  library: "feature",
};
```

### DB Migration

**`db.ts`:**

```sql
ALTER TABLE projects ADD COLUMN scope TEXT DEFAULT 'app';
```

---

## Fase 4: Sub-agentes Isolados por Step — 🔴 ~8h

### Contexto do Pi SDK

O Pi suporta spawn de subprocessos via `pi --mode rpc`. Protocolo: JSONL sobre stdin/stdout.

Referência: exemplo oficial `extensions/subagent/` no repositório Pi.

```
Request (stdin):
{"type":"rpc_request","id":"1","command":"prompt","params":{"message":"Research auth patterns"}}

Response (stdout):
{"type":"rpc_response","id":"1","content":[{"type":"text","text":"Found auth in src/auth.ts..."}]}
```

No SDK Node.js:

```typescript
const result = await pi.exec(
  "pi",
  [
    "--mode",
    "rpc",
    "--no-session", // sem arquivo de sessão
    "--model",
    modelId,
    "--thinking-level",
    "medium",
    "--no-extensions", // sub-agente não carrega extensões
    "--extension",
    agentProfilePath,
  ],
  {
    input: promptText, // stdin → RPC request
    timeout: 300_000,
  },
);

// result = { exitCode, stdout, stderr }
```

### Arquitetura

````
┌─────────────────────────────────────────────────────┐
│  Blueprint Orchestrator (PiBridge modificado)       │
│                                                     │
│  Feature Session (Pi agente principal)              │
│    │                                                │
│    ├─► attemptInjection()                           │
│    │    └─ em vez de pi.sendUserMessage()           │
│    │    └─ spawna subprocesso Pi via pi.exec()      │
│    │                                                │
│    ▼                                                │
│  Subprocesso pi --mode rpc                          │
│    │  └─ System prompt = skills/agents/{type}.md    │
│    │  └─ Tools = limitadas ao step                  │
│    │  └─ Context = feature + memories + interviews   │
│    │                                                │
│    ├─► Gera artifacts via blueprint_save_artifact   │
│    ├─► Retorna summary em bloco ```                 │
│    ▼                                                │
│  Orchestrator coleta artifacts, avança step         │
└─────────────────────────────────────────────────────┘
````

### Arquivos

| Arquivo                           | Tipo      | Descrição                                                            |
| --------------------------------- | --------- | -------------------------------------------------------------------- |
| `services/subagent-manager.ts`    | Novo      | Gerenciador de subprocessos Pi (spawn, kill, parse output)           |
| `skills/agents/spec.md`           | Novo      | Profile: spec agent (tools: read, blueprint_save_artifact)           |
| `skills/agents/research.md`       | Novo      | Profile: research agent (tools: read, grep, blueprint_search_memory) |
| `skills/agents/ddd.md`            | Novo      | Profile: DDD modeling agent                                          |
| `skills/agents/design.md`         | Novo      | Profile: design agent (tools: blueprint_design_mockup)               |
| `skills/agents/implementation.md` | Novo      | Profile: implementation agent (tools: read, write, edit, bash)       |
| `skills/agents/review.md`         | Novo      | Profile: review agent                                                |
| `skills/agents/memory.md`         | Novo      | Profile: memory update agent                                         |
| `pi-bridge.ts`                    | Modificar | `attemptInjection()` usa sub-agente                                  |
| `tools/subagent.ts`               | Novo      | Tools `blueprint_spawn_subagent` + `blueprint_collect_result`        |
| `components/SubagentProgress.tsx` | Novo      | UI de progresso do sub-agente                                        |

### Subagent Manager

**`services/subagent-manager.ts`:**

````typescript
import { getPiRef } from "./pi-config-reader.js";

export interface SubagentConfig {
  id: string;
  featureId: string;
  projectId: string;
  stepName: string;
  actionType: string;
  profile: string; // Path to skills/agents/{type}.md
  modelId?: string;
  thinkingLevel?: string;
  prompt: string;
  timeout: number;
}

export interface SubagentResult {
  success: boolean;
  output: string;
  artifacts: Array<{ type: string; filename: string; content: string }>;
  summary: string;
  error?: string;
}

export async function spawnSubagent(
  config: SubagentConfig,
): Promise<SubagentResult> {
  const pi = getPiRef();
  if (!pi) throw new Error("Pi not connected");

  try {
    const result = await pi.exec(
      "pi",
      [
        "--mode",
        "rpc",
        "--no-session",
        "--no-extensions",
        "--extension",
        config.profile,
        ...(config.modelId ? ["--model", config.modelId] : []),
        ...(config.thinkingLevel
          ? ["--thinking-level", config.thinkingLevel]
          : []),
      ],
      {
        input: buildRpcPrompt(config),
        timeout: config.timeout,
      },
    );

    return parseSubagentOutput(result.stdout, config);
  } catch (err: any) {
    return {
      success: false,
      output: err?.stderr ?? "",
      artifacts: [],
      summary: "",
      error: err?.message ?? "Unknown error",
    };
  }
}

function parseSubagentOutput(
  stdout: string,
  config: SubagentConfig,
): SubagentResult {
  const lines = stdout.split("\n").filter(Boolean);
  const artifacts = [];
  let summary = "";

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.type === "rpc_response" && msg.content) {
        const text = msg.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");

        // Extract ```blueprint-artifact blocks
        const pattern = /```blueprint-artifact\s*\n([\s\S]*?)```/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          try {
            artifacts.push(JSON.parse(match[1]));
          } catch {}
        }

        // Extract ``` summary block
        const summaryMatch = text.match(/```\s*\n([\s\S]*?)```/);
        if (summaryMatch) summary += summaryMatch[1] + "\n";
      }
    } catch {}
  }

  return {
    success: true,
    output: stdout,
    artifacts,
    summary: summary || "No summary extracted",
  };
}
````

### Agent Profiles

**`skills/agents/spec.md`:**

````markdown
---
name: spec-agent
description: Writes detailed specifications for a feature
tools: blueprint_save_artifact, blueprint_read_artifact, blueprint_search_memory, read
model: claude-sonnet-4-20250514
thinkingLevel: medium
---

# Spec Agent

You are a technical specification writer.

## Input

Feature title, description, project context, research findings, interview answers.

## Output

Save a spec artifact via `blueprint_save_artifact` with type "spec".
Must include:

1. Functional requirements (numbered)
2. Non-functional requirements
3. Acceptance criteria (Given/When/Then)
4. Edge cases and error handling

When done, output summary in a ``` block.
````

### Integração no PiBridge

**`pi-bridge.ts`** — Modificar `attemptInjection()`:

```typescript
async function attemptInjection(runId: string): Promise<void> {
  // ... validações existentes (pi ref, queue, retry logic) ...

  const actionRun = getActionRun(runId);
  const ctx = gatherPromptContext(actionRun);
  const prompt = buildPrompt(ctx);

  updateActionRunStatus(runId, "injected");
  bus.emit("action:updated", { id: runId, status: "injected" });

  // ═══ SUB-AGENTE ═══
  notifyStatusChange(runId, "agent_running");

  const { spawnSubagent } = await import("./services/subagent-manager.js");
  const result = await spawnSubagent({
    id: runId,
    featureId: actionRun.feature_id!,
    projectId: actionRun.project_id!,
    stepName: actionRun.step_name!,
    actionType: actionRun.action_type,
    profile: `skills/agents/${actionRun.action_type}.md`,
    prompt,
    timeout: ACTION_TIMEOUT_MS,
  });

  if (result.success) {
    for (const artifact of result.artifacts) {
      db.prepare(
        "INSERT INTO artifacts (id, feature_id, step_name, type, filename, content) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        nanoid(),
        actionRun.feature_id,
        actionRun.step_name,
        artifact.type,
        artifact.filename,
        artifact.content,
      );
    }
    notifyAgentEnd(runId);
  } else {
    notifyAgentError(runId, result.error ?? "Subagent failed");
  }
}
```

---

## Fase 5: Step Design — Mockups + A/B Testing — 🟠 ~5h

### Contexto

Pesquisa de inspirações:

| Projeto                         | Pattern                                                        | Como usar                                         |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| **OpenDesignr** (`opendesignr`) | Board-first, live sliders, export PNG, MCP server              | Inspiração para DesignControls + canvas + handoff |
| **Claude Design** (Anthropic)   | HTML/CSS/JS real, design system onboarding, handoff bundle     | Inspiração para fluxo design → implementation     |
| **VyBit** (`bitovi/vybit`)      | Point-n-click no browser, MCP tool loop, Storybook integration | Inspiração para feedback loop na UI               |
| **Keak SDK** (`@keak/sdk`)      | `<Experiment>` + `<Variant>` React components, visual editing  | Inspiração para A/B testing components            |

### Fluxo

```
1. Sub-agente design lê spec + research + entrevistas
2. Gera design system (tokens: cores, spacing, typography)
3. Gera 2-3 variantes de mockup (HTML/CSS/JS)
4. Canvas renderiza variantes lado a lado em iframes sandboxed
5. Usuário interage:
   → Live sliders ajustam CSS variables nos iframes
   → Clique pra dar feedback inline
   → "Select A" ou "Select B"
6. Feedback volta pro sub-agente
7. Sub-agente refina variante escolhida
8. Output: handoff bundle (HTML + tokens + spec visual) → artifacts
9. Steps seguintes (impl_plan, implementation) usam o bundle
```

### Novas Dependências

Nenhuma — os mockups são HTML/CSS/JS puro (sem framework), renderizados em iframes sandboxed.

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS design_variants (
    id TEXT PRIMARY KEY,
    feature_id TEXT NOT NULL REFERENCES features(id),
    label TEXT NOT NULL,
    html_content TEXT NOT NULL,
    css_content TEXT NOT NULL,
    js_content TEXT,
    tokens_json TEXT,
    feedback TEXT,
    selected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS design_tokens (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    feature_id TEXT REFERENCES features(id),
    tokens_json TEXT NOT NULL,
    source_step TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### Tools

**`tools/design.ts`:**

```typescript
export const designMockupTool = {
  name: "blueprint_design_mockup",
  description: "Generate HTML/CSS mockup variants for A/B testing",
  parameters: Type.Object({
    feature_id: Type.String(),
    variant_label: Type.String(),
    html_content: Type.String(),
    css_content: Type.String(),
    js_content: Type.Optional(Type.String()),
    design_tokens: Type.Optional(Type.Record(Type.String(), Type.Any())),
  }),
  execute: async (_id, params) => {
    const db = getDb();
    const variantId = nanoid();

    db.prepare(
      `
            INSERT INTO design_variants (id, feature_id, label, html_content, css_content, js_content, tokens_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
    ).run(
      variantId,
      params.feature_id,
      params.variant_label,
      params.html_content,
      params.css_content,
      params.js_content ?? null,
      params.design_tokens ? JSON.stringify(params.design_tokens) : null,
    );

    // Also save as artifact for the flow
    db.prepare(
      `
            INSERT INTO artifacts (id, feature_id, step_name, type, filename, content)
            VALUES (?, ?, 'design', 'mockup', ?, ?)
        `,
    ).run(
      nanoid(),
      params.feature_id,
      `design-${params.variant_label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
      params.html_content,
    );

    return {
      content: [
        { type: "text", text: `Variant "${params.variant_label}" saved.` },
      ],
      details: { variantId, label: params.variant_label },
    };
  },
};

export const designSaveTokensTool = {
  name: "blueprint_design_save_tokens",
  description: "Save extracted design tokens",
  parameters: Type.Object({
    project_id: Type.Optional(Type.String()),
    feature_id: Type.Optional(Type.String()),
    tokens: Type.Record(Type.String(), Type.Any()),
  }),
  execute: async (_id, params) => {
    const db = getDb();
    db.prepare(
      `
            INSERT INTO design_tokens (id, project_id, feature_id, tokens_json, source_step)
            VALUES (?, ?, ?, ?, 'design')
        `,
    ).run(
      nanoid(),
      params.project_id ?? null,
      params.feature_id ?? null,
      JSON.stringify(params.tokens),
    );

    return { content: [{ type: "text", text: "Design tokens saved." }] };
  },
};
```

### DesignCanvas — Layout

```
┌──────────────────────────────────────────────────────┐
│  Design Canvas                        [A/B] [Single] │
├─────────────────┬────────────────┬───────────────────┤
│                 │                │                   │
│  Variant A      │  Variant B     │  Controls Panel   │
│  (iframe)       │  (iframe)      │                   │
│                 │                │  ─ Spacing ─      │
│  ★ Selected     │                │  [═●══════] 16px  │
│                 │                │  ─ Colors ─       │
│                 │                │  Primary: [■]     │
│                 │                │  ─ Typography ─   │
│                 │                │  Size: [══●════]  │
├─────────────────┴────────────────┴───────────────────┤
│  Feedback: "Prefiro B mas com cores do A..."          │
│  [Select A]  [Select B]  [Refine with AI]            │
└──────────────────────────────────────────────────────┘
```

### DesignControls — Live Sliders

Padrão OpenDesignr `BOARD_CONTROLS` — CSS variables atualizadas via `postMessage` para iframes:

```tsx
export function DesignControls({ tokens, onChange }) {
  return (
    <div className="space-y-6 p-4">
      <ControlGroup label="Spacing">
        <SliderControl
          label="Base"
          min={4}
          max={48}
          step={4}
          value={tokens.spacing ?? 16}
          onChange={(v) => onChange({ ...tokens, spacing: v })}
        />
      </ControlGroup>
      <ControlGroup label="Colors">
        <ColorPicker
          label="Primary"
          value={tokens.primaryColor ?? "#3b82f6"}
          onChange={(v) => onChange({ ...tokens, primaryColor: v })}
        />
        <ColorPicker
          label="Background"
          value={tokens.bgColor ?? "#0a0a0f"}
          onChange={(v) => onChange({ ...tokens, bgColor: v })}
        />
      </ControlGroup>
      <ControlGroup label="Typography">
        <SliderControl
          label="Base Font Size"
          min={12}
          max={24}
          step={1}
          value={tokens.fontSize ?? 16}
          onChange={(v) => onChange({ ...tokens, fontSize: v })}
        />
      </ControlGroup>
    </div>
  );
}
```

### SKILL.md para Design

**`skills/blueprint-design/SKILL.md`:**

````markdown
---
name: blueprint-design
description: Generate UI mockups and design systems with A/B testing
triggers:
  - design the feature
  - create mockups
  - generate UI variants
  - A/B test designs
---

# Blueprint Design Skill

## Principles

- **Design System First** — Extract/generate tokens before mockups
- **A/B by Default** — Always 2+ variants (conservative + bold)
- **Accessible** — WCAG AA contrast, semantic HTML, keyboard nav
- **Responsive** — Mobile-first, breakpoints at 640/768/1024px
- **Code Quality** — Clean HTML/CSS, CSS custom properties

## Token Structure

```json
{
  "colors": { "primary": "#3b82f6", "background": "#0a0a0f", ... },
  "spacing": { "md": 16, "lg": 24, ... },
  "typography": { "fontFamily": "Inter", "fontSizeBase": 16, ... },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)", ... },
  "radii": { "md": 8, ... }
}
```
````

## Process

1. Read context (spec, research, interviews)
2. Extract/generate design tokens via `blueprint_design_save_tokens`
3. Generate 2-3 mockup variants via `blueprint_design_mockup`
4. Wait for user feedback (variant selection + inline comments)
5. Refine selected variant
6. Output: final HTML bundle + tokens as artifacts

## Mockup Guidelines

- **Variant A**: Conservative (standard layout, safe patterns)
- **Variant B**: Bold (experimental layout, distinctive visual)
- **Variant C** (optional): Compromise

````

### Routes API

**`routes/design.ts`:**

```typescript
export function registerDesignRoutes(app: FastifyInstance) {
    // List variants for a feature
    app.get("/api/features/:featureId/design/variants", async (req) => {
        const db = getDb();
        return db.prepare("SELECT * FROM design_variants WHERE feature_id = ? ORDER BY created_at ASC")
            .all(req.params.featureId);
    });

    // Select variant / submit feedback
    app.patch("/api/design/variants/:id", async (req, reply) => {
        const { id } = req.params;
        const { selected, feedback } = req.body;
        const db = getDb();

        if (selected) {
            // Unselect all other variants for this feature
            const variant = db.prepare("SELECT feature_id FROM design_variants WHERE id = ?").get(id) as any;
            if (variant) {
                db.prepare("UPDATE design_variants SET selected = 0 WHERE feature_id = ?").run(variant.feature_id);
                db.prepare("UPDATE design_variants SET selected = 1 WHERE id = ?").run(id);
            }
        }

        if (feedback !== undefined) {
            db.prepare("UPDATE design_variants SET feedback = ? WHERE id = ?").run(feedback, id);
        }

        return db.prepare("SELECT * FROM design_variants WHERE id = ?").get(id);
    });

    // Get latest design tokens for a project
    app.get("/api/projects/:projectId/design/tokens", async (req) => {
        const db = getDb();
        return db.prepare("SELECT * FROM design_tokens WHERE project_id = ? ORDER BY created_at DESC LIMIT 1")
            .get(req.params.projectId) ?? null;
    });
}
````

---

## Referências e Pesquisas

### Pi SDK Documentation

| Documento          | URL                                                   | Conteúdo                                                |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------- |
| Extensions docs    | `packages/coding-agent/docs/extensions.md`            | API completa de extensões, eventos, tools, commands     |
| SDK docs           | `packages/coding-agent/docs/sdk.md`                   | `createAgentSession()`, `ResourceLoader`, SDK embedding |
| RPC mode           | `packages/coding-agent/docs/rpc.md`                   | Protocolo JSONL stdin/stdout para headless              |
| Custom providers   | `packages/coding-agent/docs/custom-provider.md`       | `pi.registerProvider()`                                 |
| Index              | `packages/coding-agent/docs/index.md`                 | Visão geral Pi                                          |
| Subagent extension | `packages/coding-agent/examples/extensions/subagent/` | Single, parallel, chain execution de sub-agentes        |
| Extension examples | `packages/coding-agent/examples/extensions/`          | 30+ example extensions                                  |
| Pi Agents Team     | `github.com/KristjanPikhof/pi-agents-team/`           | Orchestrator multi-agente com RPC workers               |
| pi-agenticoding    | `github.com/agenticoding/pi-agenticoding`             | Context management com spawn, notebook, handoff         |

### Pi SDK Types (from `types/pi-coding-agent.d.ts`)

```typescript
interface ExtensionAPI {
  on(
    event: string,
    handler: (...args: unknown[]) => Promise<void> | void,
  ): void;
  registerTool(tool: unknown): void;
  registerCommand(
    name: string,
    config: {
      description: string;
      handler: (args: string | undefined, ctx: CommandContext) => Promise<void>;
    },
  ): void;
  sendUserMessage(
    content: string | (TextContent | ImageContent)[],
    options?: SendMessageOptions,
  ): void;
  sendMessage<T = unknown>(
    message: { customType: string; content?: T; display?: boolean },
    options?: SendMessageOptions,
  ): void;
  appendEntry<T = unknown>(customType: string, data?: T): void;
  getAvailableModels(): Model[];
  setThinkingLevel(level: ThinkingLevel): void;
  setModel(model: Model): Promise<boolean>;
  getActiveTools(): string[];
  events: ExtensionEventBus;
  exec(
    command: string,
    args: string[],
    options?: unknown,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

interface UIContext {
  notify(message: string, level?: "info" | "error" | "warn"): void;
  input(prompt: string): Promise<string | null>;
  confirm(title: string, message: string, opts?: unknown): Promise<boolean>;
  select(
    title: string,
    options: string[],
    opts?: unknown,
  ): Promise<string | undefined>;
}

interface SendMessageOptions {
  triggerTurn?: boolean;
  deliverAs?: "steer" | "followUp" | "nextTurn";
}
```

### UI/UX Patterns Research

| Padrão                | Referência             | Como aplicar no Blueprint                          |
| --------------------- | ---------------------- | -------------------------------------------------- |
| Plan Surface editável | Devin, Claude Design   | WorkflowCanvas + NodeSidebar                       |
| Progress Stream       | Claude Code, ByteChef  | WebSocket tool-call trace                          |
| Autonomy Dial         | Pattern library 2026   | Slider por step: Suggest/Draft/Execute             |
| Confirmation Gates    | Agent UX Patterns      | Triagem: undo banner / modal / typed confirm       |
| Activity Timeline     | Hatchworks 12 patterns | ActionRuns no DB + timeline UI                     |
| Error Recovery        | Tian Pan blog          | Degradação: "can't reach service, here's fallback" |
| Agent Handoffs        | Pi Agents Team         | Role cards + sub-agent progress                    |
| Start/Stop/Pause      | Multiple sources       | Controles no canvas para cada step                 |
| Skeleton States       | Tian Pan blog          | Placeholders enquanto sub-agente trabalha          |

### React Flow / Canvas Research

| Recurso                 | URL                              | Conteúdo                                     |
| ----------------------- | -------------------------------- | -------------------------------------------- |
| @xyflow/react           | npm                              | v12 com server-side support                  |
| React Flow docs         | reactflow.dev                    | Custom nodes, edges, hooks, layout           |
| ByteChef optimization   | blog.bytechef.io                 | Structural fingerprinting, useShallow, memo  |
| React Flow tips         | Medium Roman Fedytskyi           | Tratar diagrama como estado, export pipeline |
| React Flow skill        | github.com/thedogwiththedataonit | Patterns compilados para agentes             |
| Dev.to workflow builder | dev.to/azimahmed                 | ELK.js, validation, undo/redo                |
| Workflow engine lessons | techresolve.blog                 | Cuidados com custom workflow engines         |

### Design Tools Research

| Ferramenta        | Padrão                                                            | Inspiração                     |
| ----------------- | ----------------------------------------------------------------- | ------------------------------ |
| **OpenDesignr**   | Board-first JSX, live sliders, export PNG, MCP                    | DesignControls, handoff bundle |
| **Claude Design** | Design system onboarding, HTML/CSS/JS real, handoff → Claude Code | Fluxo design → implementation  |
| **VyBit**         | Point-n-click, MCP tool loop, Storybook                           | Feedback loop UI               |
| **Keak SDK**      | `<Experiment>` + `<Variant>` React, visual editing                | A/B testing components         |

---

## Ordem de Execução

```
Fase 1 (30m)  → Server Persistente — index.ts:71-75
Fase 2 (2h)   → Interview 2.0 — tool não-bloqueante + opções UI
Fase 3 (6h)   → Canvas Workflows — @xyflow/react + toggle view
Fase 4 (8h)   → Sub-agentes — subagent-manager + agent profiles
Fase 5 (5h)   → Step Design — mockups + A/B testing + design tokens
```

Cada fase entrega valor isoladamente. Fases 1-2 resolvem dores imediatas. Fases 3-5 são inovações.
