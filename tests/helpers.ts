/**
 * Shared test utilities.
 */

/** Base URL for the Nuxt test server (set by globalSetup or env). */
export function testBaseUrl(): string {
    return process.env.TEST_BASE_URL || 'http://localhost:3000';
}
