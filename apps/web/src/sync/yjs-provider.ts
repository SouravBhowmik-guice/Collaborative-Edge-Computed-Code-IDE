import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness.js';
import { supabase } from '@/lib/supabase';

// Color palette for user cursors (neon colors)
const NEON_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A8E6CF', // Mint
  '#FF8B94', // Pink
  '#B39DDB', // Lavender
  '#80DEEA', // Cyan
  '#FFAB91', // Orange
];

function hashToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
}

interface UserAwarenessState {
  userId: string;
  userName: string;
  color: string;
  lastActive: number;
  fileId: string;
}

interface AwarenessState {
  user?: UserAwarenessState;
}

interface YjsProviderInstance {
  doc: Y.Doc;
  provider: WebsocketProvider;
  awareness: Awareness;
  userId: string;
  userColor: string;
}

let providerCache: Map<string, YjsProviderInstance> = new Map();

export async function getYjsProvider(projectId: string, fileId: string): Promise<YjsProviderInstance> {
  const key = `${projectId}:${fileId}`;

  // Return cached provider if exists
  if (providerCache.has(key)) {
    return providerCache.get(key)!;
  }

  // Get current user from Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userId = user.id;
  const userColor = hashToColor(userId);
  const userName = user.email || 'Anonymous';

  // Create Yjs document
  const doc = new Y.Doc();

  // Create WebsocketProvider with Supabase Realtime WebSocket URL
  const wsUrl = `${import.meta.env.VITE_SUPABASE_URL?.replace('https://', 'wss://')}/realtime/v1/websocket?apikey=${import.meta.env.VITE_SUPABASE_ANON_KEY}&vsn=1.0.0`;

  const provider = new WebsocketProvider(
    wsUrl,
    `file:${fileId}`,
    doc,
    { connect: true }
  );

  // Set up awareness
  const awareness = provider.awareness;
  awareness.setLocalStateField('user', {
    userId,
    userName,
    color: userColor,
    lastActive: Date.now(),
    fileId,
  });

  // Handle awareness updates (remote users)
  awareness.on('change', () => {
    const states = Array.from(awareness.getStates().entries())
      .map(([clientId, state]: [number, AwarenessState]) => ({ clientId, ...state }))
      .filter(s => s.clientId !== awareness.clientID && s.user);

    // Emit presence update event for UI
    window.dispatchEvent(new CustomEvent('presence:update', {
      detail: { users: states }
    }));
  });

  // Handle connection status
  provider.on('status', (event: { status: string }) => {
    console.log('[Yjs] Connection status:', event.status);
    window.dispatchEvent(new CustomEvent('yjs:status', {
      detail: { status: event.status }
    }));
  });

  // Handle sync
  provider.on('sync', (isSynced: boolean) => {
    console.log('[Yjs] Synced:', isSynced);
    window.dispatchEvent(new CustomEvent('yjs:sync', {
      detail: { synced: isSynced }
    }));
  });

  const instance: YjsProviderInstance = {
    doc,
    provider,
    awareness,
    userId,
    userColor,
  };

  providerCache.set(key, instance);
  return instance;
}

export function disposeYjsProvider(projectId: string, fileId: string): void {
  const key = `${projectId}:${fileId}`;
  const instance = providerCache.get(key);
  if (instance) {
    instance.provider.destroy();
    instance.doc.destroy();
    providerCache.delete(key);
  }
}

export function getLocalUserColor(): string {
  // This will be called after getYjsProvider
  const instances = Array.from(providerCache.values());
  if (instances.length > 0) {
    return instances[0].userColor;
  }
  return NEON_COLORS[0];
}

export function getLocalUserId(): string {
  const instances = Array.from(providerCache.values());
  if (instances.length > 0) {
    return instances[0].userId;
  }
  return '';
}