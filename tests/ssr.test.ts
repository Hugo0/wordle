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

        // First SSR fetch triggers Nuxt page compilation — needs extra time
        it('contains title tag with Wordle', async () => {
            html = await fetchHtml('/en');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        }, 30_000);

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

        it('contains game board markup', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/game-board/);
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

        it('contains structured data', async () => {
            html = await fetchHtml('/');
            expect(html).toMatch(/application\/ld\+json|ItemList|WebApplication/);
        });

        it('contains title', async () => {
            html = html || (await fetchHtml('/'));
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });

        it('has lang="en" on html tag', async () => {
            html = html || (await fetchHtml('/'));
            expect(html).toMatch(/lang="en"/);
        });

        it('has og:image meta tag', async () => {
            html = html || (await fetchHtml('/'));
            expect(html).toMatch(/property="og:image"/);
        });

        it('has og:image dimensions', async () => {
            html = html || (await fetchHtml('/'));
            expect(html).toMatch(/property="og:image:width"/);
            expect(html).toMatch(/property="og:image:height"/);
        });

        it('has hreflang tags', async () => {
            html = html || (await fetchHtml('/'));
            expect(html).toMatch(/hreflang="x-default"/);
            expect(html).toMatch(/hreflang="en"/);
        });
    });

    describe('Game page /en SEO completeness', () => {
        let html: string;

        it('has og:image with dimensions', async () => {
            html = await fetchHtml('/en');
            expect(html).toMatch(/property="og:image"/);
            expect(html).toMatch(/property="og:image:width"/);
            expect(html).toMatch(/property="og:image:height"/);
        }, 30_000);

        it('has canonical URL', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/rel="canonical".*href="https:\/\/wordle\.global\/en"/);
        });

        it('has x-default hreflang', async () => {
            html = html || (await fetchHtml('/en'));
            expect(html).toMatch(/hreflang="x-default"/);
        });
    });

    describe('Words page /en/words', () => {
        let html: string;

        it('renders words page', async () => {
            html = await fetchHtml('/en/words');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });

        it('has hreflang tags', async () => {
            html = html || (await fetchHtml('/en/words'));
            expect(html).toMatch(/hreflang="x-default"/);
        });

        it('has canonical URL', async () => {
            html = html || (await fetchHtml('/en/words'));
            expect(html).toMatch(/rel="canonical"/);
        });
    });

    describe('Word detail page /en/word/1', () => {
        let html: string;

        it('renders word page with title', async () => {
            html = await fetchHtml('/en/word/1');
            expect(html).toMatch(/<title[^>]*>.*Wordle.*<\/title>/i);
        });

        it('has hreflang tags', async () => {
            html = html || (await fetchHtml('/en/word/1'));
            expect(html).toMatch(/hreflang="x-default"/);
        });

        it('has breadcrumb structured data', async () => {
            html = html || (await fetchHtml('/en/word/1'));
            expect(html).toMatch(/BreadcrumbList/);
        });
    });
});
