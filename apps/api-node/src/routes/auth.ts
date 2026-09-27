/**
 * Authentication Routes
 * POST /api/v1/auth/signup
 * POST /api/v1/auth/login
 * POST /api/v1/auth/refresh
 * POST /api/v1/auth/logout
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { signup, login, refreshToken, logout } from '../auth';
import { SignupRequestSchema, LoginRequestSchema, LoginResponseSchema, AuthTokensSchema } from '@collaborative-ide/shared-types/api';

const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Signup
  app.post<{ Body: z.infer<typeof SignupRequestSchema> }>(
    '/signup',
    {
      schema: {
        body: SignupRequestSchema,
        response: {
          201: LoginResponseSchema,
        },
        tags: ['Auth'],
        summary: 'Register new user',
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof SignupRequestSchema> }>, reply: FastifyReply) => {
      const result = await signup(request.body);
      return reply.status(201).send(result);
    }
  );

  // Login
  app.post<{ Body: z.infer<typeof LoginRequestSchema> }>(
    '/login',
    {
      schema: {
        body: LoginRequestSchema,
        response: {
          200: LoginResponseSchema,
        },
        tags: ['Auth'],
        summary: 'Login user',
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof LoginRequestSchema> }>, reply: FastifyReply) => {
      const result = await login(request.body);
      return reply.send(result);
    }
  );

  // Refresh token
  app.post<{ Body: z.infer<typeof RefreshRequestSchema> }>(
    '/refresh',
    {
      schema: {
        body: RefreshRequestSchema,
        response: {
          200: AuthTokensSchema,
        },
        tags: ['Auth'],
        summary: 'Refresh access token',
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof RefreshRequestSchema> }>, reply: FastifyReply) => {
      const tokens = await refreshToken(request.body.refreshToken);
      return reply.send(tokens);
    }
  );

  // Logout
  app.post(
    '/logout',
    {
      schema: {
        body: z.object({ accessToken: z.string().min(1) }),
        response: {
          200: z.object({ success: z.literal(true) }),
        },
        tags: ['Auth'],
        summary: 'Logout user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Body: { accessToken: string } }>, reply: FastifyReply) => {
      await logout(request.body.accessToken);
      return reply.send({ success: true });
    }
  );
}