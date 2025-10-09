import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['vitest.setup.ts'],
    coverage: {
      enabled: true,
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
  esbuild: {
    loader: 'ts',
    target: 'es2021',
  },
});
