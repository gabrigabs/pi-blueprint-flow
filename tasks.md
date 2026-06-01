# Blueprint Flow — Remaining Tasks

## Status Legend

- ✅ Done
- 🔧 Partially done
- ⬜ Not started

---

## Fase 1 — Home Page + Criação Inline + Visual Refinements

### 1.1 Home Page ✅

- HomeView.tsx created with workspace grid + recent flows
- Backend `GET /api/flows/recent` endpoint added

### 1.2 Criação de Flow Inline 🔧

- CreateFlowModal redesigned with goal field + workflow selector
- **Remaining:**
  - [ ] Convert modal to inline panel (slide-over instead of modal overlay)
  - [ ] Remove type/priority from main flow (infer or hide behind "...")
  - [ ] Reduce to 2 clicks max: title + Create

### 1.3 Refinamentos Visuais 🔧

- Sidebar redesigned, header refined, staggered animations added
- **Remaining:**
  - [ ] Minimum 11px font size (eliminate `text-[10px]` except mono badges)
  - [ ] Create `EmptyState.tsx` — minimal SVG illustration + contextual CTA
  - [ ] Create `Skeleton.tsx` — loading placeholders
  - [ ] Apply empty/loading states: sidebar (0 flows), home (0 workspaces), canvas (loading)
  - [ ] View transitions (fade between Home/Canvas)

---

## Fase 2 — Edit Mode Funcional

### 2.1 Step Configuration Panel ✅

- StepConfigPanel.tsx created with label, type, action, model, thinking, optional, instructions, skip condition

### 2.2 Inline Editing + Selection ✅

- Double-click label → inline edit (Enter/Escape/blur)
- Selected node visual state (border highlight)

### 2.3 Drag-and-Drop Reorder ✅

- `onNodeDragStop` → reorder based on Y position

### 2.4 AddStepPopover Expandido ⬜

- [ ] Add optional fields (collapsible): model override, thinking level, optional toggle
- [ ] After adding → auto-select node to open StepConfigPanel

### 2.5 Backend: Instructions no Prompt Builder ✅

- `stepInstructions` override in `buildPrompt` implemented
- `gatherPromptContext` reads from workflow's `steps_json`

---

## Fase 3 — Step Types + Conditional Logic

### 3.1 Step Type Execution 🔧

- Node shows type-aware action button (Manual: "Mark done", Hybrid: "Generate", Agent: "Run")
- **Remaining:**
  - [ ] Manual step: checkbox "Mark as done" + textarea for notes → `api.steps.updateStatus(id, "done")` + auto-advance
  - [ ] Hybrid step: "Generate suggestion" → show result → "Accept" / "Revise" / "Do manually"
  - [ ] Accept → done + advance. Revise → re-run with feedback.

### 3.2 Backend Step Type Awareness ⬜

- [ ] `POST /api/flows/:id/advance` — Manual → set status "current" (don't auto-run)
- [ ] Agent → current behavior (auto-run)
- [ ] Hybrid → set status "current", wait for user trigger
- [ ] `POST /api/flows/:id/run-step` — read `modelId`/`thinkingLevel` from workflow step as fallback

### 3.3 Conditional Skip Logic ⬜

- [ ] If step has `optional: true` and mode `autonomous` → auto-skip
- [ ] If step has `skipCondition` → include in prompt as context for decision
- [ ] Visual: "Optional" badge and conditional icon in EditModeNode and WorkflowStepNode

### 3.4 Drawer por Tipo ⬜

- [ ] Manual: tab "Notes"
- [ ] Hybrid: tab "Suggestion" + "Notes"
- [ ] Agent: current tabs (Artifacts, Activity, Output)

---

## Fase 4 — Polish: Micro-interações, Shortcuts, Canvas Positions

### 4.1 Micro-interações 🔧

- Staggered entry animations added, sidebar slide-in
- **Remaining:**
  - [ ] Nodes: hover scale sutil (1.01), shadow elevation
  - [ ] Buttons: press state (scale 0.97)
  - [ ] Modal/Panel: slide-in with backdrop blur

### 4.2 Keyboard Shortcuts ✅

- `Cmd+E` toggle edit mode
- `Cmd+Enter` run current step
- `Cmd+N` new flow
- `1-9` select step by index
- `j/k` or arrows navigate steps
- `[` toggle sidebar, `]` deselect, `\` toggle footer
- Escape: close modal → exit edit mode → deselect node

### 4.3 Persistir Posições do Canvas ⬜

- [ ] `onNodeDragStop` in view mode → save positions to `localStorage` (key: `flow-{id}-positions`)
- [ ] On flow open: if positions exist, use instead of auto-layout
- [ ] "Reset layout" button in toolbar to return to auto-layout

### 4.4 Error States ⬜

- [ ] Create `ErrorState.tsx` — retry button + contextual message
- [ ] Apply in: fetch failures (sidebar, canvas, drawer)

---

## Bug Fixes Applied (this session)

- ✅ Force-cancel resets step status from 'running' to 'current'
- ✅ Server startup cleans stale action runs + stuck steps
- ✅ Stop button works without WebSocket (optimistic local updates)
- ✅ Edit mode loads correct workflow (fetches via flow.workflow_id)
- ✅ Custom workflow assigned before flow creation (prevents revert to default)
- ✅ `workflow_id` added to Flow interface in store

---

## Futuro — A Definir

### Upgrade Sistema de Memória

O sistema atual de memories é básico (key-value por workspace). Ideias para evolução:

- [ ] Memória hierárquica: workspace → flow → step (contexto acumula)
- [ ] Memória semântica: embeddings para busca por similaridade
- [ ] Auto-capture: extrair insights de artifacts/interviews automaticamente
- [ ] Memory decay: relevância diminui com o tempo, priorizar recentes
- [ ] Cross-workspace memories: conhecimento compartilhado entre projetos
- [ ] Memory UI: visualização de grafo de conhecimento, não só lista
- [ ] Integração com prompt-builder: injetar memórias relevantes automaticamente no contexto do agent
- [ ] Export/import: backup e portabilidade de knowledge base

### Remake Workflow Editor

O WorkflowEditor atual (modal) é limitado e desconectado do canvas. Visão futura:

- [ ] Eliminar modal separado — editar workflow diretamente no canvas (edit mode já é a base)
- [ ] Visual workflow builder: drag-and-drop com conexões condicionais (não só linear)
- [ ] Branching: steps paralelos, merge points, conditional paths
- [ ] Step templates library: salvar/reutilizar configurações de steps entre workflows
- [ ] Workflow versioning: histórico de mudanças, rollback
- [ ] Workflow sharing: exportar/importar workflows como JSON ou entre workspaces
- [ ] Live preview: simular execução do workflow sem rodar agents
- [ ] Workflow analytics: tempo médio por step, taxa de sucesso, bottlenecks
- [ ] AI-assisted workflow creation: descrever objetivo → gerar workflow sugerido
- [ ] Workflow marketplace: templates da comunidade

### Outras Ideias Futuras

- [ ] Multi-agent: steps rodando em paralelo com agents diferentes
- [ ] Integração externa: GitHub issues, Linear, Notion como triggers/outputs
- [ ] Collaborative: múltiplos usuários no mesmo workspace em tempo real
- [ ] Mobile view: interface responsiva para acompanhar flows no celular
- [ ] Audit log: histórico completo de ações por flow
- [ ] Webhooks: notificar sistemas externos em eventos do flow
- [ ] Plugin system: extensões custom para action types

---

## Files Reference

| File                                             | Status                                   |
| ------------------------------------------------ | ---------------------------------------- |
| `web/src/App.tsx`                                | Modified (workflow fetch on flow select) |
| `web/src/store.ts`                               | Modified (workflow_id on Flow)           |
| `web/src/components/CreateFlowModal.tsx`         | Modified (order fix)                     |
| `web/src/components/canvas/StepConfigPanel.tsx`  | Created                                  |
| `web/src/components/canvas/CanvasToolbar.tsx`    | Modified (stop handler)                  |
| `web/src/components/canvas/WorkflowStepNode.tsx` | Modified (type-aware actions)            |
| `web/src/components/canvas/EditModeSaveBar.tsx`  | Created                                  |
| `web/src/components/views/HomeView.tsx`          | Created                                  |
| `web/src/hooks/useKeyboardShortcuts.ts`          | Modified (shortcuts)                     |
| `src/routes/action-runs.ts`                      | Modified (force-cancel + step reset)     |
| `src/server.ts`                                  | Modified (startup cleanup)               |
| `src/services/prompt-builder.ts`                 | Modified (stepInstructions)              |
