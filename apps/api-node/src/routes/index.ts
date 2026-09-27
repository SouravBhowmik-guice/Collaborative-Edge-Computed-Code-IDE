/**
 * Route Registration - All API endpoints
 */

import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { projectRoutes } from './projects';
import { fileRoutes } from './files';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Auth routes (public)
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  // Protected routes
  await app.register(async (protectedApp) => {
    // Add authentication hook
    protectedApp.addHook('preHandler', protectedApp.authenticate);

    await protectedApp.register(projectRoutes, { prefix: '/api/v1/projects' });
    await protectedApp.register(fileRoutes, { prefix: '/api/v1/projects/:projectId/files' });
  });
}