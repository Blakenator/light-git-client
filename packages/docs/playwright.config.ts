import { defineConfig } from '@playwright/test';

/**
 * Dedicated port for screenshot captures so it never collides with the
 * normal dev server on 4200.
 */
const SCREENSHOT_PORT = 4250;

export default defineConfig({
  testDir: './src',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://localhost:${SCREENSHOT_PORT}`,
    // Use system Chrome so we don't need a separate `playwright install` step
    channel: 'chrome',
    // Consistent rendering for screenshots
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  },
  webServer: {
    command: `pnpm --filter @light-git/frontend exec vite --port ${SCREENSHOT_PORT}`,
    url: `http://localhost:${SCREENSHOT_PORT}`,
    reuseExistingServer: true,
    timeout: 30_000,
    cwd: '../..',
  },
});
