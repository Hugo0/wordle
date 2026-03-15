/**
 * SSR Rendering Tests
 *
 * Verifies that server-rendered HTML contains correct SEO content.
 * The Nuxt dev server is auto-started by tests/setup-server.ts (vitest globalSetup).
 *
 * Override the server URL: TEST_BASE_URL=https://wordle.global pnpm test -- tests/ssr.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { testBaseUrl } from './helpers';

async function fetchHtml(path: string): Promise<string> {
    const res = await fetch(`${testBaseUrl()}${path}`, {
        headers: { Accept: 'text/html' },
    });
    return res.text();
}

describe('SSR Rendering', () => {
    describe('Game page /en', () => {
        let html: string;

        beforeAll(async () => {
            html = await fetchHtml('/en');
        });

        it('contains title tag with Wordle', () => {
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });

        it('contains og:title meta tag', () => {
            expect(html).toMatch(/property="og:title"/);
        });

        it('contains canonical link', () => {
            expect(html).toMatch(/rel="canonical"/);
        });

        it('contains hreflang tags', () => {
            expect(html).toMatch(/hreflang=/);
        });

        it('contains noscript fallback', () => {
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
        let html: string;

        beforeAll(async () => {
            html = await fetchHtml('/');
        });

        it('contains structured data', () => {
            expect(html).toMatch(/application\/ld\+json|ItemList|WebApplication/);
        });

        it('contains title', () => {
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
