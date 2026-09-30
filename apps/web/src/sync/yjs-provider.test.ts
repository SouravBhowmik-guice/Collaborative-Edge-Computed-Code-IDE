import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';

// Set up hoisted mocks BEFORE importing the module under test
const mockAwareness = {
  setLocalStateField: vi.fn(),
  on: vi.fn(),
  getStates: vi.fn().mockReturnValue(new Map()),
  clientID: 1,
};

const mockWebsocketProvider = {
  awareness: mockAwareness,
  on: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => mockWebsocketProvider),
}));

vi.mock('y-protocols/awareness.js', () => ({
  Awareness: vi.fn().mockImplementation(() => mockAwareness),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
    },
  },
}));

// Import after mocks are set up
const { getYjsProvider, disposeYjsProvider } = await import('@/sync/yjs-provider');

describe('Yjs Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    disposeYjsProvider('test-project', 'test-file');
  });

  it('should create a Yjs provider instance', async () => {
    const provider = await getYjsProvider('test-project', 'test-file');

    expect(provider).toBeDefined();
    expect(provider.doc).toBeInstanceOf(Y.Doc);
    expect(provider.provider).toBeDefined();
    expect(provider.awareness).toBeDefined();
    expect(provider.userId).toBe('test-user-id');
    expect(provider.userColor).toBeDefined();
  });

  it('should cache and return the same provider for same project/file', async () => {
    const provider1 = await getYjsProvider('test-project', 'test-file');
    const provider2 = await getYjsProvider('test-project', 'test-file');

    expect(provider1).toBe(provider2);
  });

  it('should dispose provider correctly', async () => {
    const provider = await getYjsProvider('test-project', 'test-file');
    expect(provider.provider).toBeDefined();

    disposeYjsProvider('test-project', 'test-file');

    // Getting again should create a new instance
    const provider2 = await getYjsProvider('test-project', 'test-file');
    expect(provider2).not.toBe(provider);
  });
});