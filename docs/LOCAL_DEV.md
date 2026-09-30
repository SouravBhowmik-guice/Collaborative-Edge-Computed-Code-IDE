# Local Development Guide

This guide explains how to set up and run the Collaborative Edge-Computed IDE locally for development.

## Prerequisites

- Node.js >=20.18.0 <25.0.0 (managed by Volta)
- npm >=10.0.0
- Docker and Docker Compose
- (Optional) Emscripten for WebAssembly compilation

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`:
   - Supabase URL and keys (you can use a free Supabase project)
   - AWS credentials for Bedrock access
   - JWT secret (must be at least 32 characters)
   - MongoDB URI (default is fine for local dev)
   - PGVECTOR_CONNECTION_STRING (for RAG functionality)

## Running Services

### Option 1: Using Docker Compose (Recommended for full stack)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Services will be available at:
- Node.js API: http://localhost:3001
- Python AI Service: http://localhost:8000
- MongoDB: localhost:27017
- PostgreSQL (with pgvector): localhost:5432

### Option 2: Manual Service Setup (Development)

#### MongoDB
```bash
# Using Docker (recommended)
docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_DATABASE=ide mongo:7

# Or install locally and run mongod
```

#### PostgreSQL with pgvector
```bash
# Using Docker (recommended)
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=ide -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg16
```

#### Supabase (for auth)
You can either:
1. Use a hosted Supabase project (recommended for dev)
2. Run Supabase locally using the Supabase CLI

#### Node.js API
```bash
cd apps/api-node
npm ci
npm run dev  # tsx watch src/index.ts
```

#### Python AI Service
```bash
cd apps/api-python
pip install -e .  # Installs in development mode
uvicorn src.main:app --reload  # Development mode
```

#### Wasm Module (Optional)
```bash
cd packages/wasm-core
npm run build  # ./build.sh
```

### Verification

Check that services are healthy:
- Node.js API: curl http://localhost:3001/api/v1/health
- Python AI Service: curl http://localhost:8000/api/v1/health

## Running Tests

### Node.js Tests
```bash
# From repo root
npm run test --workspace=api-node

# Or from api-node directory
cd apps/api-node
npm run test
```

### Python Tests
```bash
# From repo root
npm run test --workspace=api-python

# Or from api-python directory
cd apps/api-python
pytest tests/ -v
```

### Shared Types Tests
```bash
# From repo root
npm run test --workspace=shared-types

# Or from shared-types directory
cd packages/shared-types
npm run test
```

### All Tests
```bash
npm run test
```

## Troubleshooting

### Database Connection Issues
- Ensure MongoDB and PostgreSQL containers are healthy: `docker compose ps`
- Check connection strings in `.env` match your setup
- For MongoDB Memory Server in tests, ensure it's properly installed

### Supabase Auth Issues
- Verify your Supabase URL and keys are correct
- Ensure the JWT secret matches between services
- Test with a valid token: `curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/projects`

### Wasm Build Issues
- Install Emscripten SDK: `git clone https://github.com/emscripten-core/emsdk.git && cd emsdk && ./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh`
- Or skip Wasm build if not needed for current work

## Ports Summary

| Service | Port | Description |
|---------|------|-------------|
| Node.js API | 3001 | Main backend API |
| Python AI Service | 8000 | AI microservice with Bedrock + RAG |
| MongoDB | 27017 | Database |
| PostgreSQL | 5432 | For pgvector RAG |
| Supabase | (external) | Authentication |

## Development Workflow

1. Make changes to TypeScript/JavaScript files
2. Changes are automatically picked up by tsx watch (Node) or uvicorn reload (Python)
3. For Wasm changes, rerun `npm run build` in packages/wasm-core
4. Run relevant tests to verify changes
5. Commit and push when ready

## Production Considerations

- Set `NODE_ENV=production` and appropriate environment variables
- Use proper secrets management (AWS Secrets Manager, Vault, etc.)
- Configure resource limits and scaling in production orchestration
- Enable proper logging and monitoring