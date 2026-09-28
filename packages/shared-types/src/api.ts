/**
 * API Contracts - Shared between frontend, Node.js API, and Python AI service
 * Uses Zod for runtime validation and TypeScript types for compile-time safety
 */

import { z } from 'zod';

// ============================================================================
// Primitive Types
// ============================================================================

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
export type ObjectId = z.infer<typeof ObjectIdSchema>;

export const ISODateSchema = z.string().datetime();
export type ISODate = z.infer<typeof ISODateSchema>;

// ============================================================================
// User & Auth
// ============================================================================

export const UserSchema = z.object({
  _id: ObjectIdSchema,
  email: z.string().email(),
  passwordHash: z.string().min(1),
  supabaseId: z.string().uuid(),
  createdAt: ISODateSchema,
});

export type User = z.infer<typeof UserSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: z.object({
    _id: ObjectIdSchema,
    email: z.string().email(),
    supabaseId: z.string().uuid(),
    createdAt: ISODateSchema,
  }),
  tokens: AuthTokensSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================================================
// Projects
// ============================================================================

export const ProjectLanguageSchema = z.enum(['cpp', 'python']);
export type ProjectLanguage = z.infer<typeof ProjectLanguageSchema>;

export const ProjectSchema = z.object({
  _id: ObjectIdSchema,
  ownerId: ObjectIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  language: ProjectLanguageSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  language: ProjectLanguageSchema,
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const ProjectListResponseSchema = z.array(
  ProjectSchema.omit({ description: true })
);
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

// ============================================================================
// Files
// ============================================================================

export const FileSchema = z.object({
  _id: ObjectIdSchema,
  projectId: ObjectIdSchema,
  path: z.string().min(1).max(500),
  content: z.string(),
  language: z.string().max(50),
  updatedAt: ISODateSchema,
});

export type File = z.infer<typeof FileSchema>;

export const CreateFileRequestSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().optional().default(''),
  language: z.string().max(50).optional().default('plaintext'),
});

export type CreateFileRequest = z.infer<typeof CreateFileRequestSchema>;

export const UpdateFileRequestSchema = z.object({
  content: z.string(),
});

export type UpdateFileRequest = z.infer<typeof UpdateFileRequestSchema>;

export const FileListResponseSchema = z.array(
  FileSchema.omit({ content: true })
);
export type FileListResponse = z.infer<typeof FileListResponseSchema>;

// ============================================================================
// Health Check
// ============================================================================

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  timestamp: ISODateSchema,
  version: z.string().optional(),
  dependencies: z
    .record(z.enum(['ok', 'degraded', 'down']))
    .optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ============================================================================
// Error Responses
// ============================================================================

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
  requestId: z.string().uuid(),
  timestamp: ISODateSchema,
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// Pagination
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};