# Deployment Guide

Comprehensive deployment instructions for the Collaborative Edge-Computed Code IDE.

## Overview

This monorepo deploys to:
- **Frontend**: Vercel (React/Vite app)
- **Backend Services**: AWS ECS Fargate (Node.js API + Python AI)
- **Databases**: Supabase (PostgreSQL with pgvector, Auth, Realtime) + MongoDB Atlas
- **CI/CD**: GitHub Actions with automated testing, building, and deployment

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                              │
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
                              │
                      ┌─────────────────┐
                      │  MongoDB Atlas  │
                      │   (Node.js DB)  │
                      └─────────────────┘
```

## Prerequisites

### Accounts & Services

1. **Supabase** - [supabase.com](https://supabase.com)
   - Project with Realtime enabled
   - pgvector extension enabled
   - Anonymous and service role keys

2. **MongoDB Atlas** - [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
   - Free tier cluster (M0) or higher
   - Network access allowed from Vercel/AWS

3. **AWS Account** - [aws.amazon.com](https://aws.amazon.com)
   - ECR (Elastic Container Registry) for Docker images
   - ECS (Elastic Container Service) Fargate for hosting
   - IAM roles/policies for task execution
   - Secrets Manager for environment variables
   - Bedrock access to Claude models

4. **Vercel** - [vercel.com](https://vercel.com)
   - Account for frontend hosting
   - GitHub integration enabled

5. **GitHub** - [github.com](https://github.com)
   - Repository with GitHub Actions enabled

## Environment Variables

Create these as GitHub Repository Secrets (Settings → Secrets → Actions):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `xxxx...` |
| `AWS_REGION` | AWS region for resources | `us-east-1` |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID | `123456789012` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/ide` |
| `JWT_SECRET` | Shared secret (≥32 chars) | `a-very-long-random-secret-key-here` |
| `BEDROCK_MODEL_ID` | AWS Bedrock model ID | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `VERCEL_TOKEN` | Vercel account token | `v...` |
| `VERCEL_ORG_ID` | Vercel organization ID | `team_...` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `proj_...` |
| `TURBO_TOKEN` | Vercel Turborepo token | `t...` |
| `TURBO_TEAM` | Turborepo team slug | `your-team` |

### Vercel Project Settings

In Vercel dashboard → Project Settings → Environment Variables:

| Variable | Environment | Value |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Preview, Production | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Preview, Production | Same as `SUPABASE_ANON_KEY` |
| `VITE_API_URL` | Preview, Production | `https://ide-api-node.vercel.app` (or your domain) |
| `VITE_AI_API_URL` | Preview, Production | `https://ide-api-python.vercel.app` (Note: AI goes to AWS, not Vercel) |

> **Note**: The frontend talks directly to AWS backend services, not through Vercel. The `VITE_*` URLs should point to your AWS load balancer or ECS service endpoints.

## Local Development Setup

```bash
# 1. Clone repository
git clone <your-repo-url>
cd collaborative-edge-computed-code-ide

# 2. Install dependencies
npm install

# 3. Create .env from example
cp .env.example .env
# Edit .env with your local credentials

# 4. Start development stack
docker compose up -d

# 5. Build Wasm module
npm run build:wasm

# 6. Start all development servers
npm run dev

# Services available at:
# - Web: http://localhost:5173
# - Node API: http://localhost:3001
# - Python AI: http://localhost:8000
# - Supabase Studio: http://localhost:54321
# - MongoDB: localhost:27017
# - PostgreSQL: localhost:5432
```

## Production Deployment

### Automatic (Frontend → Vercel)

The CI/CD pipeline automatically deploys the frontend to Vercel on push to `main`:

1. GitHub Actions runs on push to `main`
2. Jobs execute:
   - `lint-typecheck` - ESLint + TypeScript checking
   - `test` - Vitest unit tests
   - `wasm-build` - Emscripten compilation (uses setup-emscripten action)
   - `deploy-frontend` - Vercel CLI build & deploy

3. Vercel deployment steps:
   - Pull environment variables from Vercel
   - Run `npm run build` (includes Wasm via turborepo)
   - Run `vercel build --prod`
   - Run `vercel deploy --prebuilt --prod`

### Manual Approval (Backend → AWS ECS)

Backend deployment requires manual approval in GitHub Actions:

1. GitHub Actions runs on push to `main` (after frontend deploys)
2. Jobs execute:
   - `docker-build-node` - Build Node.js API Docker image
   - `docker-build-python` - Build Python AI Docker image
   - (Wait for manual approval in "Deploy Backend" job)
   - `deploy-backend` - Update ECS services with new images

3. AWS ECS deployment steps:
   - Login to Amazon ECR (public registry)
   - Extract image metadata (tags/labels)
   - Build and push Docker images to ECR
   - Update ECS services with `force-new-deployment`
   - Wait for `services-stable` (healthy tasks)

### One-Time AWS Setup

```bash
# 1. Create ECR repositories
aws ecr create-repository --repository-name ide-api-node --region us-east-1
aws ecr create-repository --repository-name ide-api-python --region us-east-1

# 2. Create ECS cluster
aws ecs create-cluster --cluster-name ide-cluster --region us-east-1

# 3. Create Task Definitions
# (See templates in .aws/task-definitions/ or use AWS Console)

# 4. Create Services
# (Connect to ALB or use Service Discovery)

# 5. Store Secrets in AWS Secrets Manager
aws secretsmanager create-secret --name ide/mongodb --secret-string "mongodb+srv://..."
aws secretsmanager create-secret --name ide/supabase --secret-string "https://..."
aws secretsmanager create-secret --name ide/supabase-service --secret-string "eyJ..."
aws secretsmanager create-secret --name ide/jwt --secret-string "your-32-char-secret"
aws secretsmanager create-secret --name ide/aws --secret-string '{"AWS_REGION":"us-east-1","AWS_ACCESS_KEY_ID":"...","AWS_SECRET_ACCESS_KEY":"..."}'
aws secretsmanager create-secret --name ide/bedrock --secret-string "anthropic.claude-3-5-sonnet-20241022-v2:0"

# 6. Configure IAM Roles
# Ensure ecsTaskExecutionRole and ecsTaskRole have permissions to:
# - Read from Secrets Manager
# - Pull from ECR
# - Write CloudWatch logs
```

### Manual Deployment Trigger

To trigger a backend deployment without pushing code:

1. Go to GitHub → Actions → Select workflow
2. Click "Run workflow"
3. Select `main` branch
4. Click "Run workflow"
5. Wait for the "Deploy Backend" job to appear
6. Click "Review deployments" → "Approve"

## CI/CD Pipeline Details

The `.github/workflows/ci.yml` contains these jobs:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CI (Every Push/PR)                              │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│ Lint &       │ Tests        │ Wasm Build   │ Docker Build (Node)   │
│ Typecheck    │ (Vitest)     │ (Emscripten) │ Docker Build (Python) │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬───────────┘
       │              │              │                   │
       └──────────────┴──────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CD (main branch only)                        │
├──────────────────────┬──────────────────────────────────────────────┤
│ Deploy Frontend      │ Deploy Backend (Manual Approval)            │
│ → Vercel             │ → AWS ECS (Node + Python)                   │
└──────────────────────┴──────────────────────────────────────────────┘
```

### Job Dependencies

- `lint-typecheck` → No dependencies (runs on every push/PR)
- `test` → No dependencies (runs on every push/PR)
- `wasm-build` → No dependencies (runs on every push/PR)
- `docker-build-node` → Needs: `lint-typecheck`, `test`
- `docker-build-python` → Needs: `lint-typecheck`, `test`
- `deploy-frontend` → Needs: `lint-typecheck`, `test`, `wasm-build`
- `deploy-backend` → Needs: `docker-build-node`, `docker-build-python`
- `notify-failure` → Needs: All previous jobs (on failure only)

### Manual Approval

The `deploy-backend` job has:
```yaml
environment: production
```
This requires manual approval in GitHub under:
Repository → Settings → Environments → protection rules

## Health Checks & Monitoring

### Service Endpoints

| Service | Health Endpoint | Method |
|---------|-----------------|--------|
| Node.js API | `/api/v1/health` | GET |
| Python AI | `/health` | GET |
| Frontend | Vercel Analytics + Custom Error Boundary | N/A |

### Docker Healthchecks

Defined in Dockerfiles:
- **Node.js**: `wget -q --spider http://localhost:3001/api/v1/health || exit 1`
- **Python**: Built into Uvicorn (no explicit healthcheck needed)

### Logging

- **Node.js**: Pino → CloudWatch (via ECS awslogs driver)
- **Python**: Standard logging → CloudWatch (via ECS awslogs driver)
- **Frontend**: Vercel Logs + Browser console (in development)

### Metrics & Alarms (Recommended)

Create CloudWatch alarms for:
- CPU Utilization > 80% for 5 minutes
- Memory Utilization > 85% for 5 minutes
- 5XX Errors > 1% for 5 minutes
- Task CPU/Memory Utilization (ECS service metrics)

## Scaling Configuration

### ECS Service Settings (Recommended)

| Parameter | Node.js API | Python AI |
|-----------|-------------|-----------|
| Desired Count | 2 | 2 |
| Minimum Healthy Percent | 50 | 50 |
| Maximum Percent | 200 | 200 |
| CPU | 512 | 1024 |
| Memory | 1024 MB | 2048 MB |
| Auto Scaling Target | 70% CPU | 70% CPU |
| Scaling Policies | Target tracking | Target tracking |

### Vercel
- Automatic scaling via edge network
- Serverless functions (if using API routes) - but this app uses direct AWS calls

### Databases
- **Supabase**: Managed (auto-scales within limits)
- **MongoDB Atlas**: Auto-scaling clusters (M10+)
- **PostgreSQL (Supabase)**: Managed storage, compute add-ons available

## Security Best Practices

### Secrets Management
- Never commit `.env` or secrets to repository
- Use GitHub Secrets for CI/CD
- Use AWS Secrets Manager for runtime
- Use Vercel Environment Variables for frontend

### Network Security
- ECS tasks in private subnets
- Application Load Balancer in public subnets
- Security groups restrict traffic to necessary ports
- Supabase and MongoDB Atlas IP whitelisting

### IAM Policies
Least-privilege principles for ECS task roles:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:REGION:ACCOUNT:secret:ide/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:REGION:ACCOUNT:log-group:/ecs/ide-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

### Application Security
- JWT validation in both Node.js and Python services
- Rate limiting on all API endpoints
- Input validation/sanitization
- CORS restricted to known domains
- Helmet.js security headers (Node.js)
- FastAPI CORS middleware (Python)

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Wasm not loading** | Run `npm run build:wasm`, check `apps/web/public/wasm/` exists |
| **Supabase JWT invalid** | Verify `JWT_SECRET` matches between services and Supabase project settings |
| **Bedrock access denied** | Check IAM permissions: `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` |
| **ECS service unstable** | Check CloudWatch logs, verify task definition healthcheck, check secrets access |
| **Vercel build fails** | Verify `VITE_*` env vars set in Vercel dashboard, check for build errors in logs |
| **MongoDB connection failed** | Verify `MONGODB_URI`, network access, whitelist Vercel/AWS IPs in Atlas |
| **PostgreSQL connection failed** | Verify `PGVECTOR_CONNECTION_STRING`, check Supabase status, pgvector extension enabled |

### Log Access

- **ECS**: CloudWatch Logs → `/ecs/ide-api-node` and `/ecs/ide-api-python`
- **Vercel**: Vercel Dashboard → Deployments → Logs
- **Local**: `docker compose logs -f [service-name]`

### Debugging Commands

```bash
# View logs
docker compose logs -f api-node
docker compose logs -f api-python

# Exec into container
docker compose exec api-node sh
docker compose exec api-python sh

# Check Wasm
ls -la apps/web/public/wasm/
file apps/web/public/wasm/executor.wasm

# Test endpoints locally
curl http://localhost:3001/api/v1/health
curl http://localhost:8000/health
```

## Rollback Procedure

### Frontend (Vercel)
1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Backend (AWS ECS)
1. In AWS ECS Console → Clusters → ide-cluster → Services
2. Select service (ide-api-node or ide-api-python)
3. Click "Deploy" → "Previous task definition"
4. Select previous revision
5. Click "Deploy"

### Database
- **Supabase**: Use Point-in-Time Recovery (if enabled)
- **MongoDB Atlas**: Use Backup & Restore or Snapshots

## Maintenance

### Regular Tasks
- [ ] Monitor AWS costs (ECS, ECR, Lambda, Bedrock)
- [ ] Check Supabase usage (bandwidth, storage)
- [ ] Review MongoDB Atlas metrics and alerts
- [ ] Update dependencies: `npm update` (check for breaking changes)
- [ ] Rotate JWT_SECRET periodically (requires re-login)
- [ ] Review IAM policies and permissions quarterly

### Update Procedure
To update dependencies and redeploy:

```bash
# Update dependencies
npm update
npm run build  # Verify builds still work

# Commit changes
git add .
git commit -m "chore: update dependencies"
git push origin main

# Pipeline will handle rebuild and redeployment
```

## References

- [Project README](../README.md) - Overview and getting started
- [API Node README](../apps/api-node/README.md) - Node.js service details
- [API Python README](../apps/api-python/README.md) - Python service details
- [Web Client README](../apps/web/README.md) - Frontend details
- [Shared Types README](../packages/shared-types/README.md) - Type definitions
- [Wasm Core README](../packages/wasm-core/README.md) - Wasm module details
- [Local Development Guide](../docs/LOCAL_DEV.md) - Detailed local setup
- [System Architecture](../system_architecture.md) - High-level architecture
- [Technology Stack](../technology_stack.md) - Tech choices justification

## License

MIT — see [LICENSE](../LICENSE) for details.