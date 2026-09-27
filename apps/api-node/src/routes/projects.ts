/**
 * Project Routes
 * GET    /api/v1/projects
 * POST   /api/v1/projects
 * GET    /api/v1/projects/:id
 * PATCH  /api/v1/projects/:id
 * DELETE /api/v1/projects/:id
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getCollection, COLLECTIONS } from '../services/mongodb';
import { ObjectId } from 'mongodb';
import {
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ProjectListResponseSchema,
  PaginationQuerySchema,
  PaginatedResponseSchema
} from '@collaborative-ide/shared-types/api';

const ProjectParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  const projects = getCollection(COLLECTIONS.PROJECTS);

  // List projects (with pagination)
  app.get<{ Querystring: z.infer<typeof PaginationQuerySchema> }>(
    '/',
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: PaginatedResponseSchema(ProjectSchema.omit({ description: true })),
        },
        tags: ['Projects'],
        summary: 'List user projects',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof PaginationQuerySchema> }>, reply: FastifyReply) => {
      const { page, limit, sort, order } = request.query;
      const userId = request.user!.id;

      const skip = (page - 1) * limit;
      const sortField = sort || 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;

      const [items, total] = await Promise.all([
        projects
          .find({ ownerId: new ObjectId(userId) })
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limit)
          .toArray(),
        projects.countDocuments({ ownerId: new ObjectId(userId) }),
      ]);

      return reply.send({
        items: items.map(doc => ({
          _id: doc._id.toString(),
          ownerId: doc.ownerId.toString(),
          name: doc.name,
          description: doc.description,
          language: doc.language,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  // Create project
  app.post<{ Body: z.infer<typeof CreateProjectRequestSchema> }>(
    '/',
    {
      schema: {
        body: CreateProjectRequestSchema,
        response: {
          201: ProjectSchema,
        },
        tags: ['Projects'],
        summary: 'Create new project',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof CreateProjectRequestSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const now = new Date().toISOString();

      const project = {
        ownerId: new ObjectId(userId),
        name: request.body.name,
        description: request.body.description,
        language: request.body.language,
        createdAt: now,
        updatedAt: now,
      };

      const result = await projects.insertOne(project);

      return reply.status(201).send({
        _id: result.insertedId.toString(),
        ...project,
      });
    }
  );

  // Get project
  app.get<{ Params: z.infer<typeof ProjectParamsSchema> }>(
    '/:id',
    {
      schema: {
        params: ProjectParamsSchema,
        response: {
          200: ProjectSchema,
          404: { $ref: 'Error#' },
        },
        tags: ['Projects'],
        summary: 'Get project by ID',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof ProjectParamsSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const project = await projects.findOne({
        _id: new ObjectId(request.params.id),
        ownerId: new ObjectId(userId),
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        _id: project._id.toString(),
        ownerId: project.ownerId.toString(),
        name: project.name,
        description: project.description,
        language: project.language,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }
  );

  // Update project
  app.patch<{
    Params: z.infer<typeof ProjectParamsSchema>;
    Body: z.infer<typeof UpdateProjectRequestSchema>;
  }>(
    '/:id',
    {
      schema: {
        params: ProjectParamsSchema,
        body: UpdateProjectRequestSchema,
        response: {
          200: ProjectSchema,
          404: { $ref: 'Error#' },
        },
        tags: ['Projects'],
        summary: 'Update project',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{
      Params: z.infer<typeof ProjectParamsSchema>;
      Body: z.infer<typeof UpdateProjectRequestSchema>;
    }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const updateData = {
        ...request.body,
        updatedAt: new Date().toISOString(),
      };

      const result = await projects.findOneAndUpdate(
        { _id: new ObjectId(request.params.id), ownerId: new ObjectId(userId) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        _id: result._id.toString(),
        ownerId: result.ownerId.toString(),
        name: result.name,
        description: result.description,
        language: result.language,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      });
    }
  );

  // Delete project
  app.delete<{ Params: z.infer<typeof ProjectParamsSchema> }>(
    '/:id',
    {
      schema: {
        params: ProjectParamsSchema,
        response: {
          200: z.object({ success: z.literal(true) }),
          404: { $ref: 'Error#' },
        },
        tags: ['Projects'],
        summary: 'Delete project',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof ProjectParamsSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;

      const result = await projects.deleteOne({
        _id: new ObjectId(request.params.id),
        ownerId: new ObjectId(userId),
      });

      if (result.deletedCount === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Also delete associated files
      const files = getCollection(COLLECTIONS.FILES);
      await files.deleteMany({ projectId: new ObjectId(request.params.id) });

      return reply.send({ success: true });
    }
  );
}