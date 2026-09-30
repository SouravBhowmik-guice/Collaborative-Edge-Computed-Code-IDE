# Shared Types

TypeScript interfaces and Zod schemas shared between the Node.js API and Python AI service.

## Purpose

This package contains:
- **TypeScript interfaces** for API requests/responses, WebSocket events, and database models
- **Zod validation schemas** for environment variables and API data validation
- **Configuration loading** with runtime validation

These are used by both `@collaborative-ide/api-node` and `@collaborative-ide/api-python` to ensure type safety and validation consistency.

## Project Structure

```
packages/shared-types/
├── src/
│   ├── index.ts              # Exports all public interfaces
│   ├── api.ts                # API request/response types
│   ├── ws.ts                 # WebSocket event types
│   └── config.ts             # Zod schema for environment validation
├── tests/                    # Vitest tests
├── package.json
└── tsconfig.json
```

## Exports

The package uses `exports` in `package.json` for conditional loading:

- `./` - Main entry point (all types)
- `./api` - API-specific types
- `./ws` - WebSocket-specific types
- `./config` - Environment configuration schema

## Usage

In both API services, import like:

```typescript
// For API types
import { Project, File, User } from '@collaborative-ide/shared-types/api';

// For WebSocket events
import { CollaborationUpdate, CursorUpdate } from '@collaborative-ide/shared-types/ws';

// For config validation (Node.js only)
import { getConfig, Env } from '@collaborative-ide/shared-types/config';
```

## Development

```bash
# Run tests
npm run test --filter=shared-types

# Lint
npm run lint --filter=shared-types

# Type check
npm run typecheck --filter=shared-types

# Build (usually done automatically as part of the monorepo build)
npm run build --filter=shared-types
```

## Versioning

This package follows the monorepo version - it's published as `@collaborative-ide/shared-types@0.0.1` and used with `*` in the dependencies of the API services.

## License

MIT — see [../../LICENSE](../LICENSE) for details.