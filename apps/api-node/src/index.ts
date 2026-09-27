/**
 * Node.js API - Main Entry Point
 * Fastify server with MongoDB, Supabase Auth, and REST endpoints
 */

import Fastify, { FastifyInstance } from 'fastify';
import { getConfig } from '@collaborative-ide/shared-types/config';
import { registerRoutes } from './routes';
import { registerPlugins } from './plugins';
import { connectMongoDB, closeMongoDB } from './services/mongodb';
import { logger } from './utils/logger';

async function buildApp(): Promise<FastifyInstance> {
  const config = getConfig();
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z' }
      }
    } : true,
    ajv: {
      customOptions: { removeAdditional: 'all', strictTypes: false }
    }
  });

  // Register plugins (CORS, Helmet, JWT, Rate Limit, Swagger)
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  // Health check
  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'api-node',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  }));

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

async function start(): Promise<void> {
  try {
    const config = getConfig();

    // Connect to MongoDB
    await connectMongoDB(config.MONGODB_URI);

    // Build and start app
    const app = await buildApp();

    await app.listen({ port: config.PORT, host: '0.0.0.0' });

    logger.info(`🚀 Node API running on http://localhost:${config.PORT}`);
    logger.info(`📖 Swagger UI: http://localhost:${config.PORT}/documentation`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  await closeMongoDB();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildApp, start };