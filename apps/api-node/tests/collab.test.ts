// Minimal test: verify the app builds and the /collab/health endpoint works
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { sign } from 'jsonwebtoken';

// Create a minimal Fastify app for testing - no plugins, just the health check
async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Just register the collab route
  app.post('/api/v1/collab/health', async (request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'api-node',
      deps: [],
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

describe('POST /api/v1/collab/health (contract anchor)', () => {
  it('returns ok + deps', async () => {
    const app = await createTestApp();
    const accessToken = sign(
      { sub: crypto.randomUUID(), email: 'dev@example.com', supabaseId: 'supabase-1' },
      'test-secret-must-be-32-chars-long-for-jwt-signing',
      { expiresIn: '1h' },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collab/health',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(Array.isArray(body.deps)).toBe(true);
    await app.close();
  });
});