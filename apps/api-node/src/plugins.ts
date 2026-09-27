/**
 * Fastify Plugins Registration
 * CORS, Helmet, JWT, Rate Limit, Swagger
 */

import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { getConfig } from '@collaborative-ide/shared-types/config';
import { verifySupabaseJWT } from './auth';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  const config = getConfig();

  // CORS
  await app.register(cors, {
    origin: config.NODE_ENV === 'development' ? true : [config.VITE_API_URL].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Helmet (security headers)
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'development' ? false : undefined,
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX_REQUESTS,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    errorMessage: 'Too many requests, please try again later',
    keyGenerator: (request) => request.ip,
  });

  // JWT Authentication (Supabase JWT)
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
    verify: { algorithms: ['HS256'] },
  });

  // Custom JWT verification hook using Supabase public key
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      // Fallback: try Supabase JWT verification
      const user = await verifySupabaseJWT(request);
      if (!user) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }
      request.user = user;
    }
  });

  // Swagger/OpenAPI Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Collaborative IDE - Node API',
        description: 'REST API for project management, authentication, and file operations',
        version: '0.0.1',
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: 'Development' },
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Projects', description: 'Project management' },
        { name: 'Files', description: 'File operations' },
        { name: 'Health', description: 'Health checks' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'object' },
                },
              },
              requestId: { type: 'string', format: 'uuid' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}