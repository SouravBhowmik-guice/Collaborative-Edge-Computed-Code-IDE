# Collaborative Edge-Computed IDE — Phase 1 Handoff

## What's Built

A browser-based collaborative IDE backend with:

- **Node.js API** (`apps/api-node`): Fastify + MongoDB + Supabase Auth
  - Auth routes: signup, login, refresh, logout
  - Project CRUD routes
  - File CRUD routes (including raw content for WASM execution)
  - Migration script with admin seeding
  - Health check endpoint

- **Python AI Service** (`apps/api-python`): FastAPI + AWS Bedrock + pgvector RAG
  - JWT authentication (shared HS256 secret with Node.js)
  - SSE streaming chat/completion via Bedrock
  - Embeddings generation via Titan
  - pgvector RAG service
  - Health check endpoint

- **Shared Types** (`packages/shared-types`): Zod schemas for API contracts
  - Config validation
  - Auth tokens, projects, files, health, error responses

- **Wasm Core** (`packages/wasm-core`): Emscripten build for C++ execution

- **Web Frontend** (`apps/web`): Vite stub (Phase 2+ scope)

## Contract Table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/health` | GET | No | Health check |
| `/api/v1/auth/signup` | POST | No | Create user |
| `/api/v1/auth/login` | POST | No | Login |
| `/api/v1/projects` | GET/POST | Yes | Project CRUD |
| `/api/v1/projects/:id` | GET/PATCH/DELETE | Yes | Project operations |
| `/api/v1/projects/:pid/files` | GET/POST | Yes | File list/create |
| `/api/v1/projects/:pid/files/:path` | GET/PATCH/DELETE | Yes | File operations |
| `/api/v1/projects/:pid/files/:path/raw` | GET | Yes | Raw file content |
| `/api/v1/collab/health` | POST | Yes | Collab health check |
| `/api/v1/ai/chat` | POST | Yes | SSE chat completion |
| `/api/v1/ai/complete` | POST | Yes | SSE code completion |
| `/api/v1/ai/embeddings` | POST | Yes | Generate embeddings |

## Error Envelope

Both services return consistent 401/404/500 errors:

```json
{
  "error": { "code": "UNAUTHORIZED", "message": "..." },
  "requestId": "uuid",
  "timestamp": "ISO8601"
}
```

## Review Focus — Failure Modes Covered

| # | Failure Mode | Test |
|---|-------------|------|
| 1 | Auth contract mismatch Node↔Python | `test_node_token_accepted_by_python` |
| 2 | Env/config drift at import time | `test_missing_required_key_throws_descriptive_error` |
| 3 | Tampered signature rejected | `test_tampered_signature_rejected` |
| 4 | SSE stream cut-off | `test_client_disconnect_cancels_bedrock_stream` |
| 5 | pgvector schema absent at startup | `test_query_errors_on_missing_table` |

## What's Deliberately NOT Built (Phase 2+ Scope)

- React App-Shell / activity-bar / sidebar / mono-editor layout (Phase 3)
- Yjs CRDT multiplayer editing (Phase 2)
- Excalidraw canvas (Phase 4)
- Full Emscripten wasm compilation (Phase 2 — build.sh exists, CI handles it)
- Docker Compose supabase service (Phase 1 — service added, not yet verified locally)

## Test Results

```
Node.js API:  8/8 passing (collab, migrations, auth contract)
Python AI:    1/1 passing (cross-service auth contract)
Shared-types: 3/3 passing (config validation)
Web frontend: 2/2 passing (stub + health check)
```

## Branch Review Path

1. `git merge-base main HEAD` → merge base
2. `git diff $(git merge-base main HEAD)..HEAD --stat` → full diff
3. Review the diff against the contract table and error envelope above
4. Check `docs/LOCAL_DEV.md` for local setup instructions