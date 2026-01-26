import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for Wordle Global.
 *
 * Run with: pnpm test:e2e
 * Run headed: pnpm test:e2e --headed
 * Run specific test: pnpm test:e2e -g "homepage"
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL: "http://127.0.0.1:8000",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        // Mobile viewport for responsive testing
        {
            name: "mobile",
            use: { ...devices["iPhone 13"] },
        },
    ],
    // Local dev server - start before tests if not already running
    webServer: {
        command:
            ". venv/bin/activate && gunicorn --chdir webapp --bind 127.0.0.1:8000 app:app",
        url: "http://127.0.0.1:8000",
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
