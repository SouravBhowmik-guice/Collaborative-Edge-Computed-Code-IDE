# Phase 1 Endpoint Contracts

This document pins the exact Request/Response field contract and SSE event-name contract that both the Node.js API and Python AI service implement against. It exists to prevent drift between the two services' auth and streaming protocols.

## REST Endpoints

| Method | Path | Request Body | Success Response (2xx) |
|--------|------|--------------|------------------------|
| POST | `/api/v1/auth/signup` | `{ email: string, password: string }` | `201 { user: { _id: string, email: string, supabaseId: string }, tokens: { accessToken: string, refreshToken: string, expiresIn: number } }` |
| POST | `/api/v1/auth/login` | `{ email: string, password: string }` | `200 { user: { _id: string, email: string, supabaseId: string }, tokens: { accessToken: string, refreshToken: string, expiresIn: number } }` |
| POST | `/api/v1/projects` | `{ name: string, description?: string, language: "cpp" \| "python" }` | `201 { _id: string, ownerId: string, name: string, description?: string, language: "cpp" \| "python", createdAt: string, updatedAt: string }` |
| GET | `/api/v1/projects` | — | `200 Array<{ _id, ownerId, name, language, createdAt, updatedAt }>` |
| POST | `/api/v1/ai/chat` | `{ message: string, context?: { fileId?: string, code?: string }, model?: string }` | SSE (see below) |
| GET | `/api/v1/health` | — | `200 { status: "ok" \| "degraded" \| "down", service: "api-node" \| "api-python", timestamp: string, version?: string, dependencies?: Record<string, "ok" \| "degraded" \| "down"> }` |

## SSE Event Contract (`/api/v1/ai/chat`)

The Python service streams tokens via Server-Sent Events. The exact event names and data shapes are:

| Event | Data | Purpose |
|-------|------|---------|
| `token` | `{ "token": "string", "done": false }` | One token chunk |
| `token` | `{ "token": "", "done": true }` | End-of-stream marker (empty token, done=true) |
| `error` | `{ "code": "string", "message": "string", "retryable": boolean }` | Error during streaming |

Connection headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.

## Auth Contract (Cross-Service)

Both services accept the same HS256 JWT:
- Algorithm: `HS256`
- Shared secret: `JWT_SECRET` (from env, min 32 chars)
- Claims: `sub` (user id), `email`, `supabaseId` (optional), `exp`, `iat`
- No audience verification (`verify_aud = false`)
- Header format: `Authorization: Bearer <jwt>`

Error envelope for 401 (both services):
```json
{
  "error": { "code": "UNAUTHORIZED", "message": "string" },
  "requestId": "uuid",
  "timestamp": "ISO8601"
}
```