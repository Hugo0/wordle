import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

/**
 * Playwright E2E test configuration for Wordle Global (Nuxt).
 *
 * Run with: pnpm test:e2e
 * Run headed: pnpm test:e2e --headed
 * Run specific test: pnpm test:e2e -g "Homepage"
 */

// Use pre-built server if available (CI runs `pnpm build` first)
const hasBuild = existsSync('.output/server/index.mjs');
const serverCommand = hasBuild ? 'node .output/server/index.mjs' : 'pnpm dev';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Mobile project requires webkit deps: sudo npx playwright install-deps
        // {
        //     name: 'mobile',
        //     use: { ...devices['iPhone 13'] },
        // },
    ],
    webServer: {
        command: serverCommand,
        url: process.env.TEST_BASE_URL || 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
