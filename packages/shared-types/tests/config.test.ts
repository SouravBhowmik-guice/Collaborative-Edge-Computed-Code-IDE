import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, resetConfig } from '../src/config';

const VALID = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-access-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
  JWT_SECRET: 'test-secret-must-be-32-chars-long-for-jwt-signing',
  NODE_ENV: 'development',
  PORT: '3001',
};

beforeEach(() => {
  resetConfig();
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('SUPABASE') || k.startsWith('AWS') || k.includes('MONGO') || k.includes('JWT') || k.includes('BEDROCK')) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, VALID);
});

describe('config', () => {
  it('loads valid env and types PORT as number', () => {
    const cfg = getConfig();
    expect(cfg.PORT).toBe(3001);
    expect(cfg.SUPABASE_URL).toMatch(/^https:\/\//);
  });
  it('throws descriptive error when JWT_SECRET missing (Review Focus 2)', () => {
    delete process.env['JWT_SECRET'];
    expect(() => getConfig()).toThrow(/JWT_SECRET/);
  });
  it('throws on malformed MONGODB_URI', () => {
    process.env['MONGODB_URI'] = 'not-a-uri';
    expect(() => getConfig()).toThrow(/MONGODB_URI/);
  });
});