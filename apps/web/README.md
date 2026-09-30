# Web Client

React/Vite frontend for the Collaborative IDE featuring Monaco Editor, real-time collaboration, AI assistance, and architecture canvas.

## Features

- **Monaco Editor** — VS Code-powered code editor with syntax highlighting, IntelliSense, and themes
- **Real-time Collaboration** — Yjs + Supabase Realtime for conflict-free editing
- **AI Pair Programmer** — Streaming completions from AWS Bedrock via SSE
- **Architecture Canvas** — Shared Excalidraw whiteboard for system diagrams
- **Terminal** — Wasm-powered C++/Python execution in browser
- **Activity Bar & Sidebar** — VS Code-like layout with file explorer
- **Bottom Panel** — Terminal, AI chat, and canvas tabs
- **Hot Module Replacement** — Fast development with Vite

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Language | TypeScript 5.5 |
| Styling | Tailwind CSS v4 |
| Editor | @monaco-editor/react |
| Realtime | Yjs + y-websocket + y-monaco |
| State | React Context (AuthProvider) |
| HTTP | Fetch API (with Vite proxy) |
| Icons | Lucide React (via Tailwind) |

## Project Structure

```
apps/web/
├── public/
│   └── wasm/                   # Wasm module (built from wasm-core)
├── src/
│   ├── index.css               # Global styles
│   ├── main.tsx                # App entry point
│   ├── vite-env.d.ts           # Vite type definitions
│   ├── layout/
│   │   ├── AppShell.tsx        # Main layout container
│   │   ├── ActivityBar.tsx     # Left sidebar
│   │   ├── Sidebar.tsx         # File explorer
│   │   └── BottomPanel.tsx     # Terminal/AI/Canvas
│   ├── editor/
│   │   └── EditorGroup.tsx     # Monaco editor tabs
│   ├── terminal/
│   │   └── WasmTerminal.tsx    # Wasm execution terminal
│   ├── canvas/
│   │   └── ExcalidrawCanvas.tsx # Shared whiteboard
│   ├── ai/
│   │   ├── AIChatPanel.tsx     # AI chat interface
│   │   ├── ContextService.tsx  # Provides editor context to AI
│   │   └── InlineCompletion.tsx # Ghost text completions
│   ├── hooks/
│   │   └── useAuth.tsx         # Auth context & Supabase client
│   ├── lib/
│   │   └── supabase.ts         # Supabase client singleton
│   ├── sync/
│   │   ├── yjs-provider.ts     # Yjs + Supabase Realtime binding
│   │   ├── RemoteCursor.tsx    # Remote user cursors
│   │   └── y-monaco-binding.ts # Yjs + Monaco integration
│   ├── index.html              # HTML template
│   └── ...                     # Additional components
├── tests/                      # Vitest tests
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
├── postcss.config.js           # Tailwind CSS config
└── tailwind.config.js          # Tailwind CSS config
```

## Quick Start

```bash
# Install dependencies (from repo root)
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase and API URLs

# Start development server
npm run dev --filter=web

# Or build for production
npm run build --filter=web
npm run preview --filter=web
```

## Environment Variables (Vite)

These must be prefixed with `VITE_` and exposed to the client:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_API_URL` | Yes | Node.js API URL (e.g., `http://localhost:3001`) |
| `VITE_AI_API_URL` | Yes | Python AI API URL (e.g., `http://localhost:8000`) |

## Development

```bash
# Run tests
npm run test --filter=web

# Lint
npm run lint --filter=web

# Type check
npm run typecheck --filter=web

# Format
npm run format  # Runs prettier on whole repo
```

## Wasm Integration

The Wasm module is built from `packages/wasm-core` and output to `apps/web/public/wasm/`.

To rebuild Wasm:
```bash
npm run build:wasm  # From repo root
```

## Deployment

The web app is deployed to Vercel via GitHub Actions on push to `main`. Environment variables must be set in the Vercel dashboard.

See [root DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.

## Architecture Overview

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

## Contributing

Please follow the [Contributing](../CONTRIBUTING.md) guidelines in the root directory.

## License

MIT — see [LICENSE](../LICENSE) for details.