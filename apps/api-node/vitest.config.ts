import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/vitest.global-setup.ts'],
    globalTeardown: ['./tests/vitest.global-teardown.ts'],
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});