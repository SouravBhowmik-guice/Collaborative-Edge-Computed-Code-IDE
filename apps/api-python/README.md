# Python AI Service

FastAPI-based microservice for AI-powered code assistance with AWS Bedrock integration, SSE streaming, and RAG capabilities.

## Features

- **AI Code Completion** — Streaming completions via AWS Bedrock (Claude 3.5 Sonnet)
- **SSE Streaming** — Token-by-token streaming with `sse-starlette`
- **RAG (Retrieval-Augmented Generation)** — pgvector similarity search for context
- **Embeddings** — Document/code embedding generation and storage
- **JWT Authentication** — Shared secret validation with Node.js API
- **Health Checks** — `/health` endpoint for load balancers

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI 0.109+ |
| Server | Uvicorn (ASGI) |
| AI Provider | AWS Bedrock (boto3) |
| Vector DB | pgvector (PostgreSQL) |
| Auth | python-jose (JWT) |
| Streaming | sse-starlette |
| Config | pydantic-settings |
| Testing | pytest + pytest-asyncio |

## Project Structure

```
apps/api-python/
├── src/
│   └── collaborative_ide_api_python/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app + lifespan
│       ├── config.py               # Pydantic settings
│       ├── models/
│       │   └── __init__.py         # Pydantic models
│       ├── routes/
│       │   ├── __init__.py         # Route registration
│       │   ├── ai.py               # AI completion endpoints
│       │   ├── embeddings.py       # Embedding endpoints
│       │   └── health.py           # Health check
│       ├── services/
│       │   ├── __init__.py
│       │   ├── auth.py             # JWT verification
│       │   ├── bedrock.py          # Bedrock client & streaming
│       │   ├── embeddings.py       # Embedding generation
│       │   └── rag.py              # RAG retrieval
│       └── utils/
│           ├── __init__.py
│           └── logger.py           # Structured logging
├── tests/                          # Pytest tests
├── Dockerfile                      # Multi-stage build
├── pyproject.toml                  # Python packaging
└── requirements.txt                # (generated from pyproject.toml)
```

## Quick Start

```bash
# Install dependencies (from repo root)
npm install  # Installs shared-types too

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start PostgreSQL with pgvector (via Docker Compose)
docker compose up -d postgres

# Run development server
cd apps/api-python
pip install -e ".[dev]"
uvicorn src.collaborative_ide_api_python.main:app --reload --port 8000

# Or run with Docker
docker build -t ide-api-python -f Dockerfile .
docker run -p 8000:8000 --env-file ../../.env ide-api-python
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `PGVECTOR_CONNECTION_STRING` | Yes | PostgreSQL + pgvector connection |
| `JWT_SECRET` | Yes | Shared secret (≥32 chars) |
| `AWS_REGION` | Yes | AWS region for Bedrock |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `BEDROCK_MODEL_ID` | Yes | Bedrock model (e.g., `anthropic.claude-3-5-sonnet-20241022-v2:0`) |
| `ENVIRONMENT` | No | `development` \| `staging` \| `production` |
| `PORT` | No | Server port (default: 8000) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

## API Endpoints

### Health
- `GET /health` — Service health check

### AI Completion
- `POST /api/v1/ai/complete` — Streaming code completion (SSE)
  - Body: `{ "prompt": "...", "context": {...}, "max_tokens": 2048 }`
  - Returns: Server-Sent Events stream

### Embeddings
- `POST /api/v1/embeddings` — Generate embeddings
  - Body: `{ "texts": ["..."], "model": "..." }`
- `POST /api/v1/embeddings/search` — Vector similarity search
  - Body: `{ "query": "...", "top_k": 5, "filter": {} }`

## Development

```bash
cd apps/api-python

# Run tests
pytest -v

# Lint
ruff check src/

# Type check
mypy src/

# Format
ruff format src/
```

## Docker

```bash
# Build (from repo root)
docker build -t ide-api-python -f apps/api-python/Dockerfile .

# Run
docker run -p 8000:8000 --env-file .env ide-api-python
```

## AWS Bedrock Setup

1. **Enable Model Access** in AWS Console → Bedrock → Model access
2. **IAM Permissions** for the service role:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
       "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
     }]
   }
   ```

## RAG / pgvector

The service uses PostgreSQL with pgvector for document retrieval:

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- Adjust dimensions for your model
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector index for similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

## Deployment

Images are built and pushed to AWS ECR via GitHub Actions on push to `main`. ECS services are updated with manual approval.

See [root DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment guide.