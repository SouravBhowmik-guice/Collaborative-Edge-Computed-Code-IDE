/**
 * File Routes
 * GET    /api/v1/projects/:projectId/files
 * POST   /api/v1/projects/:projectId/files
 * GET    /api/v1/projects/:projectId/files/:path
 * PATCH  /api/v1/projects/:projectId/files/:path
 * DELETE /api/v1/projects/:projectId/files/:path
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getCollection, COLLECTIONS } from '../services/mongodb';
import { ObjectId } from 'mongodb';
import {
  FileSchema,
  CreateFileRequestSchema,
  UpdateFileRequestSchema,
  FileListResponseSchema,
  PaginationQuerySchema,
  PaginatedResponseSchema
} from '@collaborative-ide/shared-types/api';

const ProjectParamsSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

const FilePathParamsSchema = z.object({
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  path: z.string().min(1).max(500),
});

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  const files = getCollection(COLLECTIONS.FILES);
  const projects = getCollection(COLLECTIONS.PROJECTS);

  // Verify project ownership middleware
  const verifyProjectAccess = async (projectId: string, userId: string) => {
    const project = await projects.findOne({
      _id: new ObjectId(projectId),
      ownerId: new ObjectId(userId),
    });
    return !!project;
  };

  // List files in project
  app.get<{
    Params: z.infer<typeof ProjectParamsSchema>;
    Querystring: z.infer<typeof PaginationQuerySchema>;
  }>(
    '/',
    {
      schema: {
        params: ProjectParamsSchema,
        querystring: PaginationQuerySchema,
        response: {
          200: PaginatedResponseSchema(FileSchema.omit({ content: true })),
          404: { $ref: 'Error#' },
        },
        tags: ['Files'],
        summary: 'List project files',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{
      Params: z.infer<typeof ProjectParamsSchema>;
      Querystring: z.infer<typeof PaginationQuerySchema>;
    }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId } = request.params;
      const { page, limit, sort, order } = request.query;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const skip = (page - 1) * limit;
      const sortField = sort || 'updatedAt';
      const sortOrder = order === 'asc' ? 1 : -1;

      const [items, total] = await Promise.all([
        files
          .find({ projectId: new ObjectId(projectId) })
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limit)
          .toArray(),
        files.countDocuments({ projectId: new ObjectId(projectId) }),
      ]);

      return reply.send({
        items: items.map(doc => ({
          _id: doc._id.toString(),
          projectId: doc.projectId.toString(),
          path: doc.path,
          language: doc.language,
          updatedAt: doc.updatedAt,
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }
  );

  // Create file
  app.post<{
    Params: z.infer<typeof ProjectParamsSchema>;
    Body: z.infer<typeof CreateFileRequestSchema>;
  }>(
    '/',
    {
      schema: {
        params: ProjectParamsSchema,
        body: CreateFileRequestSchema,
        response: {
          201: FileSchema,
          404: { $ref: 'Error#' },
          409: { $ref: 'Error#' }, // Conflict - file exists
        },
        tags: ['Files'],
        summary: 'Create file in project',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{
      Params: z.infer<typeof ProjectParamsSchema>;
      Body: z.infer<typeof CreateFileRequestSchema>;
    }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId } = request.params;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if file already exists
      const existing = await files.findOne({
        projectId: new ObjectId(projectId),
        path: request.body.path,
      });

      if (existing) {
        return reply.status(409).send({
          error: { code: 'CONFLICT', message: 'File already exists' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const now = new Date().toISOString();
      const file = {
        projectId: new ObjectId(projectId),
        path: request.body.path,
        content: request.body.content ?? '',
        language: request.body.language ?? 'plaintext',
        updatedAt: now,
      };

      const result = await files.insertOne(file);

      return reply.status(201).send({
        _id: result.insertedId.toString(),
        projectId: projectId,
        ...file,
      });
    }
  );

  // Get file content
  app.get<{ Params: z.infer<typeof FilePathParamsSchema> }>(
    '/:path',
    {
      schema: {
        params: FilePathParamsSchema,
        response: {
          200: FileSchema,
          404: { $ref: 'Error#' },
        },
        tags: ['Files'],
        summary: 'Get file content',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof FilePathParamsSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId, path } = request.params;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const file = await files.findOne({
        projectId: new ObjectId(projectId),
        path,
      });

      if (!file) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'File not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        _id: file._id.toString(),
        projectId: file.projectId.toString(),
        path: file.path,
        content: file.content,
        language: file.language,
        updatedAt: file.updatedAt,
      });
    }
  );

  // Update file content
  app.patch<{
    Params: z.infer<typeof FilePathParamsSchema>;
    Body: z.infer<typeof UpdateFileRequestSchema>;
  }>(
    '/:path',
    {
      schema: {
        params: FilePathParamsSchema,
        body: UpdateFileRequestSchema,
        response: {
          200: FileSchema,
          404: { $ref: 'Error#' },
        },
        tags: ['Files'],
        summary: 'Update file content',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{
      Params: z.infer<typeof FilePathParamsSchema>;
      Body: z.infer<typeof UpdateFileRequestSchema>;
    }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId, path } = request.params;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const result = await files.findOneAndUpdate(
        { projectId: new ObjectId(projectId), path },
        {
          $set: {
            content: request.body.content,
            updatedAt: new Date().toISOString(),
          }
        },
        { returnDocument: 'after', upsert: false }
      );

      if (!result) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'File not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        _id: result._id.toString(),
        projectId: result.projectId.toString(),
        path: result.path,
        content: result.content,
        language: result.language,
        updatedAt: result.updatedAt,
      });
    }
  );

  // Delete file
  app.delete<{ Params: z.infer<typeof FilePathParamsSchema> }>(
    '/:path',
    {
      schema: {
        params: FilePathParamsSchema,
        response: {
          200: z.object({ success: z.literal(true) }),
          404: { $ref: 'Error#' },
        },
        tags: ['Files'],
        summary: 'Delete file',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof FilePathParamsSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId, path } = request.params;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const result = await files.deleteOne({
        projectId: new ObjectId(projectId),
        path,
      });

      if (result.deletedCount === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'File not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({ success: true });
    }
  );

  // Get raw file content (for WASM execution)
  app.get<{ Params: z.infer<typeof FilePathParamsSchema> }>(
    '/:path/raw',
    {
      schema: {
        params: FilePathParamsSchema,
        response: {
          200: z.object({ content: z.string() }),
          404: { $ref: 'Error#' },
        },
        tags: ['Files'],
        summary: 'Get raw file content for execution',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof FilePathParamsSchema> }>, reply: FastifyReply) => {
      const userId = request.user!.id;
      const { projectId, path } = request.params;

      const hasAccess = await verifyProjectAccess(projectId, userId);
      if (!hasAccess) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Project not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      const file = await files.findOne({
        projectId: new ObjectId(projectId),
        path,
      });

      if (!file) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'File not found' },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({ content: file.content });
    }
  );
}