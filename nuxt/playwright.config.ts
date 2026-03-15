import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Wordle Global (Nuxt).
 *
 * Run with: pnpm test:e2e
 * Run headed: pnpm test:e2e --headed
 * Run specific test: pnpm test:e2e -g "Homepage"
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : 4,
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
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
    },
});
