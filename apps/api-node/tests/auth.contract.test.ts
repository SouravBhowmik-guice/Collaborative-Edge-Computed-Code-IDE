import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { sign } from 'jsonwebtoken';
import { connectMongoDB, closeMongoDB, getDb } from '../src/services/mongodb';
import { registerPlugins } from '../src/plugins';
import { collabRoutes } from '../src/routes/collab';

async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: { removeAdditional: 'all', strictTypes: false }
    }
  });

  // Connect to MongoDB FIRST (before registering routes which call getCollection)
  await connectMongoDB(process.env['MONGODB_URI']!);

  // Register plugins (without swagger for tests)
  await registerPlugins(app, true);

  // Register ONLY the collab route (which has a simple inline schema to avoid zod-to-json-schema issues)
  await app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', protectedApp.authenticate);
    await protectedApp.register(collabRoutes, { prefix: '/api/v1/collab' });
  });

  // Global error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error, 'Unhandled error');

    const statusCode = error.statusCode || 500;
    const response = {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: statusCode === 500 ? 'Internal server error' : error.message,
        details: error.validation ? error.validation : undefined
      },
      requestId: request.id,
      timestamp: new Date().toISOString()
    };

    return reply.status(statusCode).send(response);
  });

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
      requestId: request.id,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// Node per-route contract assertions — assert the error envelope only
describe('api-node 401 shape', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeMongoDB();
    await app.close();
  });

  it('returns error envelope with code, message, requestId on collab route', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/collab/health' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('error.code', 'UNAUTHORIZED');
    expect(body).toHaveProperty('requestId');
    expect(body).toHaveProperty('timestamp');
  });

  it('returns error envelope with tampered token on collab route', async () => {
    const token = sign(
      { sub: crypto.randomUUID(), email: 'dev@example.com' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collab/health',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('error.code', 'UNAUTHORIZED');
    expect(body).toHaveProperty('requestId');
    expect(body).toHaveProperty('timestamp');
  });

  it('returns error envelope with expired token on collab route', async () => {
    const token = sign(
      { sub: crypto.randomUUID(), email: 'dev@example.com' },
      'test-secret-must-be-32-chars-long-for-jwt-signing',
      { expiresIn: '-1h' }
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collab/health',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('error.code', 'UNAUTHORIZED');
    expect(body).toHaveProperty('requestId');
    expect(body).toHaveProperty('timestamp');
  });
});