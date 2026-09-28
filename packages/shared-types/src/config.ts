/**
 * Configuration - Shared environment validation and defaults
 */

import { z } from 'zod';

// ============================================================================
// Environment Schema
// ============================================================================

export const EnvSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // MongoDB
  MONGODB_URI: z.string().url(),

  // AWS
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  BEDROCK_MODEL_ID: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  AI_PORT: z.coerce.number().int().positive().default(8000),

  // Frontend (Vite)
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_API_URL: z.string().url().optional(),
  VITE_AI_API_URL: z.string().url().optional(),

  // Wasm
  WASM_MEMORY_LIMIT_MB: z.coerce.number().int().positive().default(128),
  WASM_TIME_LIMIT_MS: z.coerce.number().int().positive().default(5000),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof EnvSchema>;

// ============================================================================
// Parsed Config (with defaults)
// ============================================================================

let cachedConfig: Env | null = null;

export function getConfig(): Env {
  if (cachedConfig) return cachedConfig;

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}

// ============================================================================
// Feature Flags
// ============================================================================

export const FeatureFlagsSchema = z.object({
  enableWasmExecution: z.boolean().default(true),
  enableMultiplayer: z.boolean().default(true),
  enableAIChat: z.boolean().default(true),
  enableArchitectureCanvas: z.boolean().default(false), // Phase 6
  enableRAG: z.boolean().default(true),
  debugMode: z.boolean().default(false),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export function getFeatureFlags(): FeatureFlags {
  return FeatureFlagsSchema.parse({
    enableWasmExecution: process.env['ENABLE_WASM'] !== 'false',
    enableMultiplayer: process.env['ENABLE_MULTIPLAYER'] !== 'false',
    enableAIChat: process.env['ENABLE_AI'] !== 'false',
    enableArchitectureCanvas: process.env['ENABLE_CANVAS'] === 'true',
    enableRAG: process.env['ENABLE_RAG'] !== 'false',
    debugMode: process.env['DEBUG'] === 'true',
  });
}