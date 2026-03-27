import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'test-results/html-report', open: 'never' }]],
  outputDir: 'test-results/artifacts',
  timeout: 120000,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3010',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Simulate a mid-range Android device for mobile tests
    ...devices['Pixel 5'],
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/e2e-journey.spec.ts',
    },
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/e2e-journey.spec.ts',
    },
  ],
})
