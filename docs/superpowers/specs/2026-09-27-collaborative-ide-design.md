# Collaborative Edge-Computed Code IDE — Design Specification

**Version:** 1.0.0  
**Date:** 2026-09-27  
**Status:** Approved for Implementation

---

## 1. Executive Summary

A browser-based, high-performance collaborative IDE that eliminates local setup friction by executing code directly in the browser via WebAssembly (Wasm). Features real-time multiplayer editing (CRDT), AI pair programming (AWS Bedrock), and an interactive architecture canvas.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDGE CLIENT (Browser)                     │
│  ┌──────────────┐ ┌──────────────────────────────────────────┐  │
│  │ Activity Bar │ │           EDITOR GROUP (Monaco)           │  │
│  │ (Left 48px)  │ │  ┌────────────────────────────────────┐  │  │
│  └──────────────┘ │  │ Tab Bar + Monaco Editor Instance    │  │  │
│  ┌──────────────┐ │  │  └────────────────────────────────────┘  │  │
│  │  SIDEBAR     │ │  │       WASM EXECUTION ENGINE             │  │
│  │ (250px resiz)│ │  │  (C++ → Emscripten → Wasm Module)      │  │
│  └──────────────┘ │  └──────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           BOTTOM PANEL (30% resizable)                      │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │  │
│  │  │ Wasm Terminal│ │   AI Chat    │ │ Architecture Canvas│  │  │
│  │  └──────────────┘ └──────────────┘ └────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │  Supabase   │ │   Node.js   │ │  Python     │
       │  Realtime   │ │  API (Mongo)│ │  FastAPI    │
       │  (CRDT/WebS)│ │             │ │  (Bedrock)  │
       └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 3. Monorepo Structure (Turborepo)

```
/apps
  /web                    # React + Vite + TypeScript frontend
  /api-node               # Node.js + Express/Fastify + MongoDB
  /api-python             # Python + FastAPI + AWS Bedrock + pgvector
/packages
  /shared-types           # TypeScript interfaces (API contracts, WS events)
  /wasm-core              # C++ source + Emscripten build scripts
```

---

## 4. Phase 1: Backend Services (Current Implementation Target)

### 4.1 Node.js API Service (`/apps/api-node`)

**Purpose:** Project/user management, MongoDB persistence, authentication, API gateway

**Tech Stack:**
- Runtime: Node.js 20+
- Framework: **Fastify** (chosen for performance, TypeScript support)
- Database: MongoDB (native driver, no ODM)
- Auth: **Supabase Auth** (JWT) — integrates with Supabase Realtime for CRDT
- Validation: Zod schemas (shared with `/packages/shared-types`)

**API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/login` | Login, return Supabase JWT |
| GET | `/api/v1/projects` | List user's projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/:id` | Get project details |
| PATCH | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |
| GET | `/api/v1/projects/:id/files` | List project files |
| POST | `/api/v1/projects/:id/files` | Create file |
| PATCH | `/api/v1/projects/:id/files/:path` | Update file content |
| GET | `/api/v1/health` | Health check |

**Data Models (MongoDB):**
```typescript
// User
{ _id: ObjectId, email: string, passwordHash: string, supabaseId: string, createdAt: Date }

// Project
{ _id: ObjectId, ownerId: ObjectId, name: string, description: string, 
  language: 'cpp' | 'python', createdAt: Date, updatedAt: Date }

// File
{ _id: ObjectId, projectId: ObjectId, path: string, content: string, 
  language: string, updatedAt: Date }
```

**Docker:** Multi-stage (builder → Alpine runtime)

### 4.2 Python AI Microservice (`/apps/api-python`)

**Purpose:** AWS Bedrock integration, SSE streaming, RAG with pgvector

**Tech Stack:**
- Runtime: Python 3.11+
- Framework: FastAPI
- AI: AWS Bedrock (Claude 3.5 Sonnet via LangChain)
- Vector DB: Supabase pgvector
- Streaming: Server-Sent Events (SSE)
- Auth: JWT validation (shared secret with Node API)

**API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ai/complete` | Streaming code completion (SSE) |
| POST | `/api/v1/ai/chat` | Streaming chat (SSE) |
| POST | `/api/v1/ai/embeddings` | Generate embeddings for RAG |
| GET | `/api/v1/health` | Health check |

**SSE Event Format:**
```
event: token
data: {"token": "partial", "done": false}

event: token
data: {"token": "response", "done": true}

event: error
data: {"message": "rate limited"}
```

**RAG Pipeline:**
1. Ingest AWS/coding docs → chunk → embed → store in pgvector
2. On query: embed user question → similarity search → inject context → Bedrock

### 4.3 Shared Types (`/packages/shared-types`)

**Purpose:** Single source of truth for API contracts, WebSocket events, config

```typescript
// api-contracts.ts
export interface Project { id: string; name: string; language: 'cpp' | 'python'; ... }
export interface File { id: string; path: string; content: string; ... }
export interface AuthTokens { accessToken: string; refreshToken: string; }

// ws-events.ts (for CRDT sync)
export interface CRDTOperation { clientId: string; ops: YjsDoc[]; timestamp: number; }
export interface PresenceUpdate { userId: string; cursor: { line: number; ch: number }; color: string; }
```

---

## 5. Phase 2: Wasm Execution Engine

### 5.1 C++ Runtime (`/packages/wasm-core`)

**Source Structure:**
```
/wasm-core
  /src
    main.cpp              # Entry point, exports `runCode(code: string): ExecutionResult`
    executor.cpp          # Sandbox execution logic
    memory_manager.cpp    # Wasm linear memory management
  /include
    executor.h
  CMakeLists.txt
  build.sh                # Emscripten build script
```

**Exported Functions:**
```cpp
// Compiled to Wasm + JS glue
extern "C" {
  ExecutionResult* runCode(const char* code, const char* language);
  void freeResult(ExecutionResult* result);
}
```

**ExecutionResult:**
```cpp
struct ExecutionResult {
  int exitCode;
  char* stdout;
  char* stderr;
  uint64_t executionTimeMs;
  bool memoryLimitExceeded;
  bool timeLimitExceeded;
};
```

**Build Output:** `/apps/web/public/wasm/executor.wasm` + `executor.js`

**Security:** Wasm sandbox — no filesystem, no network, configurable memory/time limits

### 5.2 Browser Integration (`/apps/web/src/wasm`)

- Load Wasm module on demand
- `executeCode(code: string, language: 'cpp'): Promise<ExecutionResult>`
- Stream stdout/stderr to terminal UI

---

## 6. Phase 3: Frontend Shell + Monaco Editor

### 6.1 Layout (CSS Grid, 100vh/100vw, no body scroll)

```css
:root {
  --app-bg: #0D1117;
  --editor-bg: #161B22;
  --sidebar-bg: #010409;
  --accent: #2F81F7;
  --text: #E6EDF3;
  --muted: #8B949E;
  --success: #3FB950;
  --warning: #D29922;
  --error: #F85149;
  --ai: #A371F7;
}
```

**Grid Areas:**
```
"nav      nav      nav"      48px
"activity sidebar editor"    1fr
"activity panel  panel"      30%
```

### 6.2 Monaco Editor Configuration

- Theme: Custom dark theme mapping to CSS variables
- Font: `JetBrains Mono` with ligatures
- Minimap: Enabled
- Line numbers: Relative
- Multiplayer cursors: Custom overlay divs (Phase 4)

### 6.3 Key Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| `AppShell` | `src/layout/AppShell.tsx` | Root grid layout |
| `ActivityBar` | `src/layout/ActivityBar.tsx` | Left icon navigation |
| `Sidebar` | `src/layout/Sidebar.tsx` | File tree, search, AI, canvas |
| `EditorGroup` | `src/editor/EditorGroup.tsx` | Tab bar + Monaco |
| `BottomPanel` | `src/layout/BottomPanel.tsx` | Terminal, AI, Canvas tabs |
| `WasmTerminal` | `src/terminal/WasmTerminal.tsx` | CLI-like output |
| `AIChatPanel` | `src/ai/AIChatPanel.tsx` | SSE streaming chat |

---

## 7. Phase 4: Multiplayer CRDT Sync

### 7.1 Architecture

- **Library:** Yjs (mature, good Monaco binding via `y-monaco`)
- **Transport:** Supabase Realtime (WebSocket)
- **Persistence:** Yjs doc → MongoDB (periodic snapshots)

### 7.2 Data Flow

```
User A types → Monaco → y-monaco → Yjs Doc → Supabase WS → User B
                                                    ↓
                                              Yjs Doc → y-monaco → Monaco
```

### 7.3 Presence & Cursors

- Each user: unique color (hash of userId → neon palette)
- Cursor: `<div class="remote-cursor" style="border-color: #color">`
- Tooltip: username, fades after 2s inactivity
- Selection: semi-transparent background in user's color

### 7.4 Conflict Resolution

- Yjs CRDT: mathematically guarantees convergence
- Last-writer-wins for scalar values, sequence merge for text

---

## 8. Phase 5: AI Pair Programmer

### 8.1 Features

- **Inline Completion:** Ghost text at cursor (Tab to accept)
- **Chat Panel:** SSE stream, purple accent (`--ai`), blinking cursor during generation
- **Context:** Current file + open tabs + project structure
- **RAG:** pgvector search on AWS/docs embeddings

### 8.2 Frontend Integration

```typescript
// SSE connection
const eventSource = new EventSource('/api/v1/ai/chat', {
  headers: { Authorization: `Bearer ${token}` }
});

eventSource.addEventListener('token', (e) => {
  const { token, done } = JSON.parse(e.data);
  appendToResponse(token);
  if (done) eventSource.close();
});
```

### 8.3 Prompt Templates

- **Completion:** "Complete the code at cursor. Context: {fileContext}"
- **Chat:** "You are an expert developer. User asks: {question}. Context: {projectFiles}"
- **Explain:** "Explain this code: {selection}"

---

## 9. Phase 6: Architecture Canvas

### 9.1 Requirements

- Shared whiteboard synced via Yjs (same CRDT as editor)
- Shapes: rectangles, arrows, text, sticky notes
- Export: PNG, SVG, Mermaid.js
- Real-time multiplayer cursors

### 9.2 Implementation Options

- **Option A:** Excalidraw + `y-excalidraw` binding (fastest)
- **Option B:** Custom Canvas (Fabric.js/Konva) + custom Yjs type

**Recommendation:** Option A — Excalidraw is mature, has Yjs binding, matches VS Code aesthetic

---

## 10. Deployment & CI/CD

### 10.1 GitHub Actions Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node, setup-python, npm ci, npm run lint, npm run test]
  
  wasm-build:
    runs-on: ubuntu-latest
    steps: [checkout, setup-emscripten, npm run build:wasm]
  
  docker-build:
    needs: [lint-test, wasm-build]
    runs-on: ubuntu-latest
    steps: [docker-build-node, docker-build-python, push-ecr]
  
  deploy-frontend:
    needs: docker-build
    runs-on: ubuntu-latest
    steps: [vercel-deploy]
```

### 10.2 Environments

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | `npm run dev` (Vite) | Docker Compose | Local MongoDB + Supabase local |
| Staging | Vercel Preview | AWS ECS (staging) | Supabase staging |
| Production | Vercel Prod | AWS ECS (prod) | Supabase prod + MongoDB Atlas |

---

## 11. Global Constraints

| Constraint | Value |
|------------|-------|
| Node.js | >=20.18.0 <25.0.0 |
| Python | >=3.11 |
| TypeScript | Strict mode, no `any` |
| Tailwind | v4, CSS variables for theming |
| Monaco Editor | Latest stable |
| Yjs | Latest stable |
| Supabase JS | Latest stable |
| AWS SDK | v3 (modular) |
| Emscripten | Latest via `emsdk` |
| Docker | Multi-stage, Alpine runtime |
| Git | Conventional commits |

---

## 12. Review Focus (Uncovered Failure Modes)

| Input / Condition | Expected Behavior |
|-------------------|-------------------|
| Wasm module fails to load | Graceful fallback: show error in terminal, don't crash editor |
| Supabase WS disconnects mid-edit | Queue local ops, replay on reconnect, show "reconnecting" indicator |
| Bedrock SSE stream cuts off | Show partial response, "Continue" button, preserve conversation |
| Large file (>1MB) in Monaco | Virtualize, lazy-load, warn before opening |
| Concurrent edits same line | CRDT merges correctly, no data loss, both cursors visible |
| Auth token expires during session | Silent refresh via Supabase, no user-visible interruption |
| Memory limit hit in Wasm | Kill execution, return `memoryLimitExceeded`, show in terminal |
| Network offline | "Offline" badge, queue mutations, sync on reconnect |

---

## 13. Implementation Task Breakdown

### Phase 1 Tasks (Backend Services)
- Task 1.1: Turborepo scaffold + shared-types package
- Task 1.2: Node.js API (Fastify + MongoDB + Supabase Auth)
- Task 1.3: Python AI Service (FastAPI + Bedrock + SSE + pgvector)
- Task 1.4: Docker configs + Docker Compose for local dev
- Task 1.5: GitHub Actions CI/CD pipeline

### Phase 2 Tasks (Wasm Engine)
- Task 2.1: C++ executor + Emscripten build
- Task 2.2: Wasm load/execute in browser
- Task 2.3: Terminal UI integration

### Phase 3 Tasks (Frontend Shell)
- Task 3.1: React/Vite + Tailwind + Theme config
- Task 3.2: AppShell layout + ActivityBar + Sidebar
- Task 3.3: Monaco Editor integration + custom theme
- Task 3.4: BottomPanel + WasmTerminal + AIChatPanel

### Phase 4 Tasks (CRDT Sync)
- Task 4.1: Yjs + Supabase Realtime setup
- Task 4.2: y-monaco binding + collaborative cursors
- Task 4.3: Presence system + conflict resolution

### Phase 5 Tasks (AI Pair Programmer)
- Task 5.1: SSE client + streaming UI
- Task 5.2: Prompt templates + context injection
- Task 5.3: RAG pipeline (ingest + query)

### Phase 6 Tasks (Architecture Canvas)
- Task 6.1: Excalidraw + y-excalidraw integration
- Task 6.2: Canvas sidebar tab + export

---

## 14. Acceptance Criteria (Per Phase)

### Phase 1 Complete When:
- [ ] `npm run dev` starts Node + Python APIs + Vite frontend
- [ ] `POST /api/v1/auth/signup` → returns JWT
- [ ] `POST /api/v1/projects` → creates project in MongoDB
- [ ] `POST /api/v1/ai/chat` → streams tokens via SSE
- [ ] Docker Compose brings up all services
- [ ] CI pipeline passes on PR

### Phase 2 Complete When:
- [ ] `npm run build:wasm` outputs `.wasm` + `.js` to `web/public/wasm/`
- [ ] `executeCode('int main(){return 42;}', 'cpp')` → `{exitCode: 42, stdout: ''}`
- [ ] Terminal shows compilation + execution output

### Phase 3 Complete When:
- [ ] Full-screen layout matches spec (no body scroll)
- [ ] Monaco loads with custom dark theme
- [ ] File tree shows project files
- [ ] Tabs work for multiple files

### Phase 4 Complete When:
- [ ] Two browser tabs: edits sync <50ms
- [ ] Remote cursors visible with names/colors
- [ ] Reconnect after disconnect syncs correctly

### Phase 5 Complete When:
- [ ] Ghost completions appear at cursor
- [ ] Chat streams tokens with purple accent
- [ ] RAG returns relevant AWS/docs context

### Phase 6 Complete When:
- [ ] Canvas draws shapes, syncs across tabs
- [ ] Export produces valid Mermaid/PNG

---

*End of Specification*