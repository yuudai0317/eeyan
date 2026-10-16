import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** ローカルの Supabase（supabase start）に対して動かす統合テスト */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
