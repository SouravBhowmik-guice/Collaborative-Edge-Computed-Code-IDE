/**
 * WebSocket Events - CRDT Sync, Presence, and Real-time Collaboration
 * Shared between frontend (Yjs) and backend (Supabase Realtime)
 */

import { z } from 'zod';
import { ObjectIdSchema, ISODateSchema } from './api';

// ============================================================================
// CRDT Operations (Yjs)
// ============================================================================

export const YjsDocUpdateSchema = z.object({
  // Yjs binary update (Uint8Array serialized as base64)
  update: z.string(),
  // Optional: client ID that originated this update
  clientId: z.string().uuid().optional(),
});

export type YjsDocUpdate = z.infer<typeof YjsDocUpdateSchema>;

export const CRDTOperationSchema = z.object({
  clientId: z.string().uuid(),
  ops: z.array(YjsDocUpdateSchema),
  timestamp: z.number().int().positive(), // Unix ms
});

export type CRDTOperation = z.infer<typeof CRDTOperationSchema>;

// ============================================================================
// Presence (Cursors, Selections, User Status)
// ============================================================================

export const CursorPositionSchema = z.object({
  line: z.number().int().nonnegative(),
  ch: z.number().int().nonnegative(),
});

export type CursorPosition = z.infer<typeof CursorPositionSchema>;

export const SelectionRangeSchema = z.object({
  anchor: CursorPositionSchema,
  head: CursorPositionSchema,
});

export type SelectionRange = z.infer<typeof SelectionRangeSchema>;

export const UserPresenceSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/), // Hex color
  cursor: CursorPositionSchema.optional(),
  selection: SelectionRangeSchema.optional(),
  lastActive: z.number().int().positive(), // Unix ms
  fileId: z.string().optional(), // Which file they're viewing
});

export type UserPresence = z.infer<typeof UserPresenceSchema>;

export const PresenceUpdateSchema = z.object({
  type: z.enum(['join', 'leave', 'update']),
  presence: UserPresenceSchema,
});

export type PresenceUpdate = z.infer<typeof PresenceUpdateSchema>;

// ============================================================================
// Awareness (Yjs awareness protocol)
// ============================================================================

export const AwarenessStateSchema = z.object({
  user: UserPresenceSchema,
  // Yjs-specific: clock for conflict resolution
  clock: z.number().int().nonnegative().optional(),
});

export type AwarenessState = z.infer<typeof AwarenessStateSchema>;

// ============================================================================
// Supabase Realtime Channels
// ============================================================================

export const RealtimeChannelSchema = z.enum([
  'project:{projectId}', // Project-level: file CRDT, presence
  'file:{fileId}',       // File-level: fine-grained editing
  'ai:{projectId}',      // AI chat streaming
  'canvas:{projectId}',  // Architecture canvas
]);

export type RealtimeChannel = z.infer<typeof RealtimeChannelSchema>;

// ============================================================================
// WebSocket Message Envelopes
// ============================================================================

export const WSMessageTypeSchema = z.enum([
  // CRDT
  'crdt:update',
  'crdt:sync',
  'crdt:ack',
  // Presence
  'presence:join',
  'presence:leave',
  'presence:update',
  // Awareness
  'awareness:update',
  'awareness:sync',
  // AI Streaming
  'ai:token',
  'ai:done',
  'ai:error',
  // Canvas
  'canvas:update',
  'canvas:sync',
  // System
  'system:ping',
  'system:pong',
  'system:error',
]);

export type WSMessageType = z.infer<typeof WSMessageTypeSchema>;

export const WSMessageSchema = z.object({
  type: WSMessageTypeSchema,
  channel: z.string(),
  payload: z.unknown(),
  timestamp: z.number().int().positive(), // Unix ms
  messageId: z.string().uuid(),
});

export type WSMessage = z.infer<typeof WSMessageSchema>;

// Type-safe message creators
export const createWSMessage = <T>(
  type: WSMessageType,
  channel: string,
  payload: T
): WSMessage => ({
  type,
  channel,
  payload,
  timestamp: Date.now(),
  messageId: crypto.randomUUID(),
});

// ============================================================================
// Channel-specific Payloads
// ============================================================================

// CRDT Channel Payloads
export const CRDTUpdatePayloadSchema = z.object({
  fileId: z.string(),
  update: z.string(), // base64 encoded Yjs update
  clientId: z.string().uuid(),
  version: z.number().int().nonnegative(), // Document version for ordering
});

export type CRDTUpdatePayload = z.infer<typeof CRDTUpdatePayloadSchema>;

export const CRDTSyncPayloadSchema = z.object({
  fileId: z.string(),
  state: z.string(), // base64 encoded full Yjs state
  version: z.number().int().nonnegative(),
});

export type CRDTSyncPayload = z.infer<typeof CRDTSyncPayloadSchema>;

export const CRDTAckPayloadSchema = z.object({
  fileId: z.string(),
  version: z.number().int().nonnegative(),
  clientId: z.string().uuid(),
});

export type CRDTAckPayload = z.infer<typeof CRDTAckPayloadSchema>;

// Presence Channel Payloads
export const PresenceJoinPayloadSchema = z.object({
  projectId: z.string(),
  user: UserPresenceSchema,
});

export type PresenceJoinPayload = z.infer<typeof PresenceJoinPayloadSchema>;

export const PresenceLeavePayloadSchema = z.object({
  projectId: z.string(),
  userId: z.string().uuid(),
});

export type PresenceLeavePayload = z.infer<typeof PresenceLeavePayloadSchema>;

export const PresenceUpdatePayloadSchema = z.object({
  projectId: z.string(),
  user: UserPresenceSchema,
});

export type PresenceUpdatePayload = z.infer<typeof PresenceUpdatePayloadSchema>;

// AI Streaming Payloads
export const AITokenPayloadSchema = z.object({
  requestId: z.string().uuid(),
  token: z.string(),
  done: z.boolean(),
  metadata: z
    .object({
      model: z.string().optional(),
      usage: z
        .object({
          promptTokens: z.number().int().nonnegative(),
          completionTokens: z.number().int().nonnegative(),
        })
        .optional(),
    })
    .optional(),
});

export type AITokenPayload = z.infer<typeof AITokenPayloadSchema>;

export const AIErrorPayloadSchema = z.object({
  requestId: z.string().uuid(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
});

export type AIErrorPayload = z.infer<typeof AIErrorPayloadSchema>;

// Canvas Payloads (Excalidraw + Yjs)
export const CanvasUpdatePayloadSchema = z.object({
  projectId: z.string(),
  update: z.string(), // base64 encoded Yjs update for Excalidraw elements
  clientId: z.string().uuid(),
});

export type CanvasUpdatePayload = z.infer<typeof CanvasUpdatePayloadSchema>;