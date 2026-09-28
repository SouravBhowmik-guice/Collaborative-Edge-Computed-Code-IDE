/**
 * Collab routes — Phase 1 anchor for the Node↔Python auth/SSE contract.
 * Only /api/v1/collab/health; files route comes in Task 3's contract pass.
 */
import { FastifyInstance } from 'fastify';
import { getDb } from '../services/mongodb';

export async function collabRoutes(app: FastifyInstance): Promise<void> {
  app.post('/health', async (request, reply) => {
    const db = await getDb();
    let mongoOk = false;
    try {
      await db.admin().ping();
      mongoOk = true;
    } catch { /* leave mongoOk false — degraded reporting is the point */ }
    // contract field "deps" intentionally unused in Phase 1 — Task 4's RAG wiring binds it
    return reply.status(200).send({
      status: mongoOk ? 'ok' : 'degraded',
      service: 'api-node',
      deps: [],
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });
}