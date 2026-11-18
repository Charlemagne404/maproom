import path from 'node:path'
import { defineConfig } from '@playwright/test'
import baseConfig from '../../playwright.config'

const port = 4174

export default defineConfig({
  ...baseConfig,
  testDir: '..',
  testMatch: 'mobile-experience.spec.ts',
  outputDir: path.join(process.cwd(), 'test-results', 'mobile'),
  reporter: 'list',
  use: {
    ...baseConfig.use,
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
