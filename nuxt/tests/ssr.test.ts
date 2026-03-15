/**
 * SSR Rendering Tests
 *
 * Verifies that server-rendered HTML contains correct SEO content.
 * The Nuxt dev server is auto-started by tests/setup-server.ts (vitest globalSetup).
 *
 * Override the server URL: TEST_BASE_URL=https://wordle.global pnpm test -- tests/ssr.test.ts
 */
import { describe, it, expect } from 'vitest';

function baseUrl(): string {
    return process.env.TEST_BASE_URL || 'http://localhost:3000';
}

async function fetchHtml(path: string): Promise<string> {
    const res = await fetch(`${baseUrl()}${path}`, {
        headers: { Accept: 'text/html' },
    });
    return res.text();
}

describe('SSR Rendering', () => {
    describe('Game page /en', () => {
        let html: string;

        it('contains title tag with Wordle', async () => {
            html = await fetchHtml('/en');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });

        it('contains og:title meta tag', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/property="og:title"/);
        });

        it('contains canonical link', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/rel="canonical"/);
        });

        it('contains hreflang tags', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/hreflang=/);
        });

        it('contains noscript fallback', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/<noscript>/i);
        });
    });

    describe('RTL page /he', () => {
        it('has dir="rtl" on html or body', async () => {
            const html = await fetchHtml('/he');
            expect(html).toMatch(/dir="rtl"/);
        });
    });

    describe('Homepage /', () => {
        it('contains structured data', async () => {
            const html = await fetchHtml('/');
            // Should have JSON-LD or relevant structured data
            expect(html).toMatch(/application\/ld\+json|ItemList|WebApplication/);
        });

        it('contains title', async () => {
            const html = await fetchHtml('/');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });
    });

    describe('Words page /en/words', () => {
        it('renders words page', async () => {
            const html = await fetchHtml('/en/words');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });
    });
});
