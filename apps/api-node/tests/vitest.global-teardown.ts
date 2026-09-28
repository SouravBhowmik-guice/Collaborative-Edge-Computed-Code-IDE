// vitest.global-teardown.ts - runs ONCE after all test files
export default async function globalTeardown() {
  const mongoServer = (global as any).__MONGO_SERVER__;
  if (mongoServer) {
    await mongoServer.stop();
    console.log('MongoDB Memory Server stopped');
  }
}