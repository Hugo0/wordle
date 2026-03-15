/**
 * Migration Parity Tests
 *
 * Verifies that the Nuxt server produces the same daily word, word list
 * length, and day index as production Flask (https://wordle.global).
 *
 * The Nuxt dev server is auto-started by globalSetup.
 * Production is fetched live by default.
 *
 * Override: PARITY_TARGET=http://other-flask pnpm test -- tests/parity.test.ts
 * Disable: SKIP_PARITY=1 pnpm test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { testBaseUrl } from './helpers';

const FLASK_URL = process.env.PARITY_TARGET || 'https://wordle.global';
const SKIP = !!process.env.SKIP_PARITY;

// ---------------------------------------------------------------------------
// Helpers to extract data from Flask HTML
// ---------------------------------------------------------------------------

async function fetchFlaskPage(lang: string): Promise<string> {
    const res = await fetch(`${FLASK_URL}/${lang}`, {
        headers: { 'User-Agent': 'WordleGlobal-ParityTest/1.0' },
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Flask ${lang}: ${res.status}`);
    return res.text();
}

function extractFlaskWord(html: string): string | null {
    // Format: todays_word = "cairn"  (can be non-latin like "קפיטן")
    const m = html.match(/todays_word\s*=\s*"([^"]+)"/);
    return m?.[1] ?? null;
}

function extractFlaskIdx(html: string): number | null {
    // Format: todays_idx = "1729"
    const m = html.match(/todays_idx\s*=\s*"(\d+)"/);
    return m ? parseInt(m[1]!, 10) : null;
}

function extractFlaskWordListLength(html: string): number | null {
    // Format: window.word_list = JSON.parse('[...]')
    const m = html.match(/window\.word_list\s*=\s*JSON\.parse\('(\[.*?\])'\)/s);
    if (!m) return null;
    try {
        return JSON.parse(m[1]!).length;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Parity tests: Nuxt API vs Flask production HTML
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)('Migration Parity: Nuxt vs Flask', () => {
    const testLanguages = ['en', 'fi', 'ar', 'he', 'de', 'es', 'fr', 'ko', 'tr', 'ru'];

    for (const lang of testLanguages) {
        describe(`${lang}`, () => {
            let flaskHtml: string;
            let nuxtData: any;

            beforeAll(async () => {
                [nuxtData, flaskHtml] = await Promise.all([
                    fetch(`${testBaseUrl()}/api/${lang}/data`).then((r) => r.json()),
                    fetchFlaskPage(lang),
                ]);
            });

            it('produces same daily word', () => {
                const flaskWord = extractFlaskWord(flaskHtml);
                expect(flaskWord).not.toBeNull();
                expect(nuxtData.todays_word).toBe(flaskWord);
            });

            it('has matching todays_idx', () => {
                const flaskIdx = extractFlaskIdx(flaskHtml);
                expect(flaskIdx).not.toBeNull();
                expect(nuxtData.todays_idx).toBe(flaskIdx);
            });

            it('has matching word list length (±5%)', () => {
                const flaskLen = extractFlaskWordListLength(flaskHtml);
                if (flaskLen === null) return;
                const nuxtLen = nuxtData.word_list.length;
                const tolerance = Math.ceil(Math.max(nuxtLen, flaskLen) * 0.05);
                expect(Math.abs(nuxtLen - flaskLen)).toBeLessThanOrEqual(tolerance);
            });
        });
    }
});

// ---------------------------------------------------------------------------
// Standalone word-selection algorithm tests (always run, no server needed)
// ---------------------------------------------------------------------------

describe('Word selection algorithm', () => {
    it('idxToDate and getTodaysIdx are inverse operations', async () => {
        const { getTodaysIdx, idxToDate } = await import(
            '../server/utils/word-selection'
        );

        const todaysIdx = getTodaysIdx('UTC');
        const date = idxToDate(todaysIdx);

        const today = new Date();
        const expectedDate = new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
        );
        expect(date.getTime()).toBe(expectedDate.getTime());
    });

    it('getTodaysIdx returns consistent value for same day', async () => {
        const { getTodaysIdx } = await import(
            '../server/utils/word-selection'
        );

        const idx1 = getTodaysIdx('UTC');
        const idx2 = getTodaysIdx('UTC');
        expect(idx1).toBe(idx2);
    });

    it('getDailyWordConsistentHash is deterministic', async () => {
        const { getDailyWordConsistentHash } = await import(
            '../server/utils/word-selection'
        );

        const words = ['crane', 'slate', 'hello', 'world', 'apple'];
        const word1 = getDailyWordConsistentHash(words, new Set(), 1700, 'en');
        const word2 = getDailyWordConsistentHash(words, new Set(), 1700, 'en');
        expect(word1).toBe(word2);
    });

    it('getDailyWordConsistentHash respects blocklist', async () => {
        const { getDailyWordConsistentHash } = await import(
            '../server/utils/word-selection'
        );

        const words = ['crane', 'slate', 'hello', 'world', 'apple'];
        const wordNoBl = getDailyWordConsistentHash(words, new Set(), 1700, 'en');
        const wordWithBl = getDailyWordConsistentHash(
            words,
            new Set([wordNoBl]),
            1700,
            'en',
        );
        expect(wordWithBl).not.toBe(wordNoBl);
    });

    it('getDailyWordLegacy uses simple modulo', async () => {
        const { getDailyWordLegacy } = await import(
            '../server/utils/word-selection'
        );

        const words = ['crane', 'slate', 'hello', 'world', 'apple'];
        expect(getDailyWordLegacy(words, new Set(), 0)).toBe('crane');
        expect(getDailyWordLegacy(words, new Set(), 1)).toBe('slate');
        expect(getDailyWordLegacy(words, new Set(), 5)).toBe('crane'); // wraps
    });
});
