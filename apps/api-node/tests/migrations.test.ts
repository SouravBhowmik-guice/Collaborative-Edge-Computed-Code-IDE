import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { resetConfig, getConfig } from '@collaborative-ide/shared-types/config';
import { COLLECTIONS } from '../src/services/mongodb';

let mongoServer: MongoMemoryServer;
let mongoUri: string;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  process.env['MONGODB_URI'] = mongoUri;

  // Set other required env vars
  process.env['SUPABASE_URL'] = 'https://test.supabase.co';
  process.env['SUPABASE_ANON_KEY'] = 'test-anon-key';
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';
  process.env['AWS_REGION'] = 'us-east-1';
  process.env['AWS_ACCESS_KEY_ID'] = 'test-access-key';
  process.env['AWS_SECRET_ACCESS_KEY'] = 'test-secret-key';
  process.env['BEDROCK_MODEL_ID'] = 'anthropic.claude-3-sonnet-20240229-v1:0';
  process.env['JWT_SECRET'] = 'test-secret-must-be-32-chars-long-for-jwt-signing';
  process.env['NODE_ENV'] = 'development';
  process.env['PORT'] = '3001';

  resetConfig();

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();

  // Run migration up
  const { createIndexes } = await import('../src/services/mongodb');
  await createIndexes(db);
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

describe('migrations', () => {
  beforeEach(async () => {
    // Clean collections before each test
    await db.collection(COLLECTIONS.USERS).deleteMany({});
    await db.collection(COLLECTIONS.PROJECTS).deleteMany({});
    await db.collection(COLLECTIONS.FILES).deleteMany({});
  });

  it('creates collections with indexes', async () => {
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);
    expect(names).toContain(COLLECTIONS.USERS);
    expect(names).toContain(COLLECTIONS.PROJECTS);
    expect(names).toContain(COLLECTIONS.FILES);
  });

  it('creates unique index on users.email', async () => {
    const users = db.collection(COLLECTIONS.USERS);
    const indexes = await users.indexes();
    const emailIndex = indexes.find(i => i.key.email === 1);
    expect(emailIndex).toBeDefined();
    expect(emailIndex?.unique).toBe(true);
  });

  it('creates unique index on users.supabaseId', async () => {
    const users = db.collection(COLLECTIONS.USERS);
    const indexes = await users.indexes();
    const supabaseIndex = indexes.find(i => i.key.supabaseId === 1);
    expect(supabaseIndex).toBeDefined();
    expect(supabaseIndex?.unique).toBe(true);
  });

  it('creates compound unique index on files.projectId + path', async () => {
    const files = db.collection(COLLECTIONS.FILES);
    const indexes = await files.indexes();
    const compoundIndex = indexes.find(i => i.key.projectId === 1 && i.key.path === 1);
    expect(compoundIndex).toBeDefined();
    expect(compoundIndex?.unique).toBe(true);
  });
});