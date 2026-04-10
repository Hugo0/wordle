/**
 * Sitemap hreflang integration tests.
 *
 * Verifies that sitemap XML contains correct hreflang annotations.
 * Requires the dev server to be running (auto-started by vitest globalSetup).
 */
import { describe, it, expect } from 'vitest';

function baseUrl(): string {
    return process.env.TEST_BASE_URL || 'http://localhost:3000';
}

async function fetchXml(path: string): Promise<string> {
    const res = await fetch(`${baseUrl()}${path}`, {
        headers: { Accept: 'application/xml' },
    });
    return res.text();
}

describe('Sitemap hreflang', () => {
    let mainXml: string;

    it('main sitemap has xhtml namespace', async () => {
        mainXml = await fetchXml('/sitemap-main.xml');
        expect(mainXml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    }, 30_000);

    it('language pages have xhtml:link hreflang elements', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        expect(mainXml).toContain('<xhtml:link rel="alternate" hreflang="en"');
        expect(mainXml).toContain('<xhtml:link rel="alternate" hreflang="fi"');
        expect(mainXml).toContain('<xhtml:link rel="alternate" hreflang="tr"');
    });

    it('root language pages have x-default pointing to / (homepage)', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // Root language pages (/{lang}) use / as x-default (language picker)
        expect(mainXml).toContain('hreflang="x-default" href="https://wordle.global/"');
    });

    it('sub-page language variants have x-default pointing to /en{path}', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // Mode pages use /en/{mode} as x-default (no language-neutral equivalent)
        expect(mainXml).toContain(
            'hreflang="x-default" href="https://wordle.global/en/unlimited"'
        );
    });

    it('remaps ckb to ku in hreflang tag', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // Tag says ku, but URL uses ckb (the actual directory)
        expect(mainXml).toContain('hreflang="ku" href="https://wordle.global/ckb"');
        // Should NOT have hreflang="ckb"
        expect(mainXml).not.toContain('hreflang="ckb"');
    });

    it('excludes invalid language codes from hreflang', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        const invalidCodes = ['nds', 'fur', 'tlh', 'qya', 'pau', 'hyw', 'ltg'];
        for (const code of invalidCodes) {
            expect(mainXml).not.toContain(`hreflang="${code}"`);
        }
    });

    it('excluded languages still have <loc> entries (indexed via sitemap)', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // These should still appear as URLs, just not in hreflang
        expect(mainXml).toContain('<loc>https://wordle.global/nds</loc>');
        expect(mainXml).toContain('<loc>https://wordle.global/tlh</loc>');
        expect(mainXml).toContain('<loc>https://wordle.global/hyw</loc>');
    });

    it('static pages have no hreflang', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // Find the /stats URL block — it should not contain xhtml:link
        const statsIdx = mainXml.indexOf('<loc>https://wordle.global/stats</loc>');
        expect(statsIdx).toBeGreaterThan(-1);
        // The <url> block for /stats should end before any xhtml:link
        const statsBlock = mainXml.slice(
            mainXml.lastIndexOf('<url>', statsIdx),
            mainXml.indexOf('</url>', statsIdx) + 6
        );
        expect(statsBlock).not.toContain('xhtml:link');
    });

    it('semantic explorer has no hreflang (English-only)', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        const semanticIdx = mainXml.indexOf('<loc>https://wordle.global/en/semantic</loc>');
        if (semanticIdx > -1) {
            const block = mainXml.slice(
                mainXml.lastIndexOf('<url>', semanticIdx),
                mainXml.indexOf('</url>', semanticIdx) + 6
            );
            expect(block).not.toContain('xhtml:link');
        }
    });

    it('word sitemaps have no hreflang', async () => {
        const wordXml = await fetchXml('/sitemap-words-en.xml');
        expect(wordXml).not.toContain('xhtml:link');
        expect(wordXml).not.toContain('hreflang');
    }, 30_000);

    it('game mode pages have hreflang', async () => {
        mainXml = mainXml || (await fetchXml('/sitemap-main.xml'));
        // Find an unlimited mode URL block
        const unlimitedIdx = mainXml.indexOf(
            '<loc>https://wordle.global/en/unlimited</loc>'
        );
        expect(unlimitedIdx).toBeGreaterThan(-1);
        const block = mainXml.slice(
            mainXml.lastIndexOf('<url>', unlimitedIdx),
            mainXml.indexOf('</url>', unlimitedIdx) + 6
        );
        expect(block).toContain('xhtml:link');
        expect(block).toContain('hreflang="x-default"');
    });
});
