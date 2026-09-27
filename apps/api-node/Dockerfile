# Node.js API Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY turbo.json ./
COPY apps/api-node/package*.json ./apps/api-node/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci --workspaces --include-workspace-root

# Copy source
COPY . .

# Build shared-types
RUN npm run build --filter=@collaborative-ide/shared-types

# Build api-node
RUN npm run build --filter=@collaborative-ide/api-node

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-node/dist ./apps/api-node/dist
COPY --from=builder /app/apps/api-node/package.json ./apps/api-node/package.json
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json

EXPOSE 3001

CMD ["node", "apps/api-node/dist/index.js"]