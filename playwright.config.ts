import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ?? ['/usr/bin/chromium', '/snap/bin/chromium'].find((path) => existsSync(path))

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    serviceWorkers: 'allow',
    viewport: { width: 1440, height: 960 },
    launchOptions: {
      ...(systemChromium ? { executablePath: systemChromium } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
