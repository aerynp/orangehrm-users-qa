import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Central config. Base URL and credentials are overridable via env vars so the
 * same suite can point at a different OrangeHRM instance without code changes.
 * See README.md for the full list of supported env vars.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // shared public demo instance: keep runs serial to reduce collisions on shared data
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Only set if PW_EXECUTABLE_PATH is provided - lets a locked-down CI runner
    // point at a pre-provisioned browser binary instead of Playwright's
    // managed download. Unset in normal local use.
    launchOptions: process.env.PW_EXECUTABLE_PATH
      ? { executablePath: process.env.PW_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
