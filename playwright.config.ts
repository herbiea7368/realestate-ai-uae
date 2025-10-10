import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'pnpm --filter @realestate-ai-uae/api dev',
      url: 'http://localhost:4001/health',
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '4001'
      }
    },
    {
      command: 'pnpm --filter @realestate-ai-uae/web dev',
      url: 'http://localhost:3000/add-listing',
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: '3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:4001'
      }
    }
  ]
});
