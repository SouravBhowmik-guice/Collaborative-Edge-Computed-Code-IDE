# Node.js API Service

Fastify-based REST API with MongoDB persistence and Supabase Auth integration.

## Features

- **Authentication** — Supabase JWT validation with fallback to local JWT
- **Projects & Files CRUD** — Full project/file management
- **Real-time Collaboration** — WebSocket endpoints for Yjs/Supabase Realtime
- **Rate Limiting** — Configurable request throttling
- **API Documentation** — Swagger/OpenAPI at `/documentation`
- **Health Checks** — `/api/v1/health` for load balancers

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Fastify 4.x |
| Database | MongoDB (native driver) |
| Auth | Supabase JWT + `@fastify/jwt` |
| Validation | Zod schemas (shared-types) |
| Logging | Pino + pino-pretty |
| Testing | Vitest + mongodb-memory-server |

## Project Structure

```
apps/api-node/
├── src/
│   ├── index.ts              # Entry point
│   ├── plugins.ts            # Fastify plugins (CORS, Helmet, JWT, RateLimit, Swagger)
│   ├── routes/
│   │   ├── index.ts          # Route registration
│   │   ├── auth.ts           # Auth endpoints
│   │   ├── projects.ts       # Project CRUD
│   │   ├── files.ts          # File CRUD
│   │   └── collab.ts         # Collaboration WebSocket
│   ├── services/
│   │   └── mongodb.ts        # MongoDB connection & indexes
│   ├── utils/
│   │   └── logger.ts         # Pino logger
│   └── auth.ts               # Supabase JWT verification
├── scripts/
│   └── migrate.ts            # Database migrations
├── Dockerfile                # Multi-stage build
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Quick Start

```bash
# Install dependencies (from repo root)
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start MongoDB (via Docker Compose)
docker compose up -d mongodb

# Run development server
npm run dev --filter=api-node

# Or build and run production
npm run build --filter=api-node
npm run start --filter=api-node
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `JWT_SECRET` | Yes | Shared secret (≥32 chars) |
| `JWT_EXPIRES_IN` | No | Access token TTL (default: 1h) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (default: 7d) |
| `NODE_ENV` | No | `development` \| `staging` \| `production` |
| `PORT` | No | Server port (default: 3001) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 60000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login with email/password
- `POST /api/v1/auth/refresh` — Refresh access token
- `GET /api/v1/auth/me` — Get current user

### Projects
- `GET /api/v1/projects` — List user's projects
- `POST /api/v1/projects` — Create project
- `GET /api/v1/projects/:id` — Get project
- `PATCH /api/v1/projects/:id` — Update project
- `DELETE /api/v1/projects/:id` — Delete project

### Files
- `GET /api/v1/projects/:projectId/files` — List files
- `POST /api/v1/projects/:projectId/files` — Create file
- `GET /api/v1/projects/:projectId/files/:fileId` — Get file
- `PATCH /api/v1/projects/:projectId/files/:fileId` — Update file
- `DELETE /api/v1/projects/:projectId/files/:fileId` — Delete file
- `GET /api/v1/projects/:projectId/files/:fileId/raw` — Raw file content

### Collaboration
- `GET /api/v1/collab/connect` — WebSocket upgrade for Yjs

## Development

```bash
# Run tests
npm run test --filter=api-node

# Lint
npm run lint --filter=api-node

# Type check
npm run typecheck --filter=api-node

# Database migrations
npm run db:migration:up --filter=api-node
npm run db:migration:create --filter=api-node -- "migration_name"
```

## Docker

```bash
# Build
docker build -t ide-api-node -f apps/api-node/Dockerfile .

# Run
docker run -p 3001:3001 --env-file .env ide-api-node
```

## Deployment

Images are built and pushed to AWS ECR via GitHub Actions on push to `main`. ECS services are updated with manual approval.

See [root DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.