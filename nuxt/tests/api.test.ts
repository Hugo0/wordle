/**
 * API Route Tests
 *
 * Tests that Nuxt server API routes return correct data shapes.
 * The Nuxt dev server is auto-started by tests/setup-server.ts (vitest globalSetup).
 *
 * Override the server URL: TEST_BASE_URL=https://wordle.global pnpm test -- tests/api.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { testBaseUrl } from './helpers';

describe('API Routes', () => {
    // ---- GET /api/languages ----

    describe('GET /api/languages', () => {
        let data: any;

        beforeAll(async () => {
            const res = await fetch(`${testBaseUrl()}/api/languages`);
            data = await res.json();
        });

        it('returns language_codes array with 65+ entries', () => {
            expect(Array.isArray(data.language_codes)).toBe(true);
            expect(data.language_codes.length).toBeGreaterThanOrEqual(65);
        });

        it('returns languages object keyed by code', () => {
            expect(typeof data.languages).toBe('object');
            expect(data.languages['en']).toBeDefined();
            expect(data.languages['en'].language_name).toBe('English');
        });

        it('includes language_popularity array', () => {
            expect(Array.isArray(data.language_popularity)).toBe(true);
            expect(data.language_popularity).toContain('en');
            expect(data.language_popularity).toContain('fi');
        });
    });

    // ---- GET /api/[lang]/data ----

    describe('GET /api/en/data', () => {
        let data: any;

        beforeAll(async () => {
            const res = await fetch(`${testBaseUrl()}/api/en/data`);
            data = await res.json();
        });

        it('returns word_list with expected length', () => {
            expect(Array.isArray(data.word_list)).toBe(true);
            expect(data.word_list.length).toBeGreaterThan(2000);
        });

        it('returns a 5-letter todays_word', () => {
            expect(typeof data.todays_word).toBe('string');
            expect(data.todays_word.length).toBe(5);
        });

        it('returns todays_idx as number', () => {
            expect(typeof data.todays_idx).toBe('number');
            expect(data.todays_idx).toBeGreaterThan(1000);
        });

        it('returns keyboard as 2D array', () => {
            expect(Array.isArray(data.keyboard)).toBe(true);
            expect(data.keyboard.length).toBeGreaterThanOrEqual(3);
            expect(data.keyboard[0].length).toBeGreaterThan(5);
        });

        it('returns config with language_code', () => {
            expect(data.config.language_code).toBe('en');
        });
    });

    describe('GET /api/he/data', () => {
        it('has right_to_left set', async () => {
            const res = await fetch(`${testBaseUrl()}/api/he/data`);
            const data = await res.json();
            expect(data.config.right_to_left).toBe('true');
        });
    });

    describe('GET /api/ko/data', () => {
        it('has physical_key_map in config', async () => {
            const res = await fetch(`${testBaseUrl()}/api/ko/data`);
            const data = await res.json();
            expect(data.config.physical_key_map).toBeDefined();
            expect(typeof data.config.physical_key_map).toBe('object');
        });
    });

    // ---- GET /api/stats ----

    describe('GET /api/stats', () => {
        it('returns expected shape', async () => {
            const res = await fetch(`${testBaseUrl()}/api/stats`);
            const data = await res.json();

            expect(typeof data.total_languages).toBe('number');
            expect(data.total_languages).toBeGreaterThanOrEqual(65);
            expect(typeof data.total_words).toBe('number');
            expect(Array.isArray(data.lang_stats)).toBe(true);
            expect(data.lang_stats.length).toBeGreaterThan(0);

            // Check a lang stat entry shape
            const en = data.lang_stats.find((l: any) => l.code === 'en');
            expect(en).toBeDefined();
            expect(en.n_words).toBeGreaterThan(0);
        });
    });

    // ---- GET /api/[lang]/words ----

    describe('GET /api/en/words', () => {
        it('returns paginated word list', async () => {
            const res = await fetch(`${testBaseUrl()}/api/en/words?page=1`);
            const data = await res.json();

            expect(data.lang_code).toBe('en');
            expect(data.page).toBe(1);
            expect(Array.isArray(data.words)).toBe(true);
            expect(data.words.length).toBeGreaterThan(0);
            expect(data.words.length).toBeLessThanOrEqual(30);

            // Check word entry shape
            const word = data.words[0];
            expect(word.day_idx).toBeDefined();
            expect(typeof word.word).toBe('string');
            expect(word.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    // ---- GET /api/[lang]/word/[id] ----

    describe('GET /api/en/word/[id]', () => {
        it('returns past word details', async () => {
            const res = await fetch(`${testBaseUrl()}/api/en/word/1700`);
            const data = await res.json();

            expect(data.lang_code).toBe('en');
            expect(data.day_idx).toBe(1700);
            expect(data.is_past).toBe(true);
            expect(data.is_future).toBe(false);
            expect(typeof data.word).toBe('string');
            expect(data.word.length).toBe(5);
        });

        it('returns is_future for far future index', async () => {
            const res = await fetch(`${testBaseUrl()}/api/en/word/99999`);
            const data = await res.json();

            expect(data.is_future).toBe(true);
            expect(data.word).toBeNull();
        });
    });

    // ---- POST /api/[lang]/word-stats ----

    describe('POST /api/en/word-stats', () => {
        it('rejects stats for non-today index', async () => {
            const res = await fetch(`${testBaseUrl()}/api/en/word-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ day_idx: 1, won: true, attempts: 3 }),
            });
            // Should return 403 "Not today"
            expect(res.status).toBe(403);
        });
    });

    // ---- 404 handling ----

    describe('Error handling', () => {
        it('returns 404 for unknown language data', async () => {
            const res = await fetch(`${testBaseUrl()}/api/nonexistent/data`);
            expect(res.status).toBe(404);
        });
    });
});
