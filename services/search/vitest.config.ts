import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    reporters: ['default', ['junit', { outputFile: 'junit.xml' }]]
  }
});
