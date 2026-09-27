# Collaborative Edge-Computed Code IDE

A browser-based, high-performance collaborative IDE that eliminates local setup friction by executing code directly in the browser via WebAssembly (Wasm). Features real-time multiplayer editing (CRDT), AI pair programming (AWS Bedrock), and an interactive architecture canvas.

## Features

- **Zero-Setup Wasm Execution** — Compile and run C++/Python directly in the browser's secure sandbox
- **Multiplayer Collaboration** — Google Docs-style real-time editing using Conflict-free Replicated Data Types (CRDTs) via Yjs + Supabase Realtime
- **AI Pair Programmer** — Context-aware code completion and architecture advice streamed token-by-token via SSE from AWS Bedrock
- **Interactive Architecture Canvas** — Shared whiteboard for drawing system diagrams alongside code (Excalidraw + y-excalidraw)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDGE CLIENT (Browser)                     │
│  ┌──────────────┐ ┌──────────────────────────────────────────┐  │
│  │ Activity Bar │ │           EDITOR GROUP (Monaco)           │  │
│  └──────────────┘ │  ┌────────────────────────────────────┐  │  │
│  ┌──────────────┐ │  │       WASM EXECUTION ENGINE        │  │  │
│  │  SIDEBAR     │ │  │  (C++ → Emscripten → Wasm Module)  │  │  │
│  └──────────────┘ │  └────────────────────────────────────┘  │  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           BOTTOM PANEL (Terminal, AI, Canvas)             │  │
│  └──────────────────────────────────────────────────────────┘  │
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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Editor | Monaco Editor (VS Code core) |
| Wasm Runtime | C++ → Emscripten |
| Real-time Sync | Yjs + Supabase Realtime (WebSockets) |
| Backend API | Node.js (Fastify) + MongoDB |
| AI Service | Python (FastAPI) + AWS Bedrock (Claude 3.5 Sonnet) |
| Vector DB | Supabase pgvector |
| Auth | Supabase Auth (JWT) |
| Build | Turborepo monorepo |
| CI/CD | GitHub Actions → Vercel (frontend) + AWS ECR/ECS (backend) |
| Containerization | Docker (multi-stage, Alpine runtime) |

## Monorepo Structure

```
├── apps/
│   ├── web/              # React + Vite frontend
│   ├── api-node/         # Node.js Fastify API + MongoDB
│   └── api-python/       # Python FastAPI + AWS Bedrock
├── packages/
│   ├── shared-types/     # TypeScript interfaces (API contracts, WS events)
│   └── wasm-core/        # C++ source + Emscripten build scripts
├── docs/
│   └── superpowers/
│       ├── specs/        # Design specifications
│       └── plans/        # Implementation plans
└── docker-compose.yml    # Local development stack
```

## Getting Started

### Prerequisites

- Node.js >= 20.18.0 < 25.0.0
- Python >= 3.11
- Docker & Docker Compose
- Emscripten SDK (`emsdk`) for Wasm builds
- Supabase account (for Realtime + pgvector + Auth)
- AWS account (for Bedrock + ECR/ECS)
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd collaborative-edge-computed-code-ide

# Install dependencies (Turborepo)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase, AWS, MongoDB credentials

# Start development stack (databases, etc.)
docker-compose up -d

# Build Wasm module
npm run build:wasm

# Start all development servers
npm run dev
```

### Environment Variables

Create a `.env` file at the root:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ide

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# JWT Secret (shared between Node and Python services)
JWT_SECRET=your_shared_secret

# Frontend
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
VITE_AI_API_URL=http://localhost:8000
```

## Development

```bash
# Start all services in parallel (Turborepo)
npm run dev

# Start individual services
npm run dev --filter=web
npm run dev --filter=api-node
npm run dev --filter=api-python

# Build Wasm module
npm run build:wasm

# Run tests
npm run test

# Lint
npm run lint

# Type check
npm run typecheck
```

## Deployment

### Frontend (Vercel)
- Connect repository to Vercel
- Set environment variables in Vercel dashboard
- Deploy on push to main

### Backend (AWS ECS)
- GitHub Actions builds and pushes Docker images to ECR
- ECS services pull from ECR
- Configure secrets in AWS Secrets Manager

## Documentation

- [Design Specification](docs/superpowers/specs/2026-09-27-collaborative-ide-design.md)
- [Implementation Plan](docs/superpowers/plans/) (generated after spec approval)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for developers who want to code anywhere, together.*