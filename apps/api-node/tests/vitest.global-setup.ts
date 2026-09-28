// vitest.global-setup.ts - runs ONCE before all test files
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export default async function globalSetup() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env['MONGODB_URI'] = uri;
  console.log('MongoDB Memory Server started at:', uri);

  // Set other env vars
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

  // Store reference for teardown
  (global as any).__MONGO_SERVER__ = mongoServer;
}