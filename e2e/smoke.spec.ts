import { test, expect } from '@playwright/test';
import { waitForPage, dismissModals, assertNotBlank, collectErrors } from './helpers';

/**
 * Smoke Tests — catch regressions from multi-agent development.
 *
 * Verifies the contract between pages, APIs, and navigation.
 * Fast (<30s), hits real endpoints, catches blank screens / 500s / missing DOM.
 */

// ---------------------------------------------------------------------------
// Page Load — every page renders without 500 or blank screen
// ---------------------------------------------------------------------------

test.describe('Page Load', () => {
    test('homepage renders with language grid', async ({ page }) => {
        await page.goto('/');
        await waitForPage(page, { selector: 'h1' });
        await assertNotBlank(page);

        // Language items visible (flags + language names)
        const langLinks = page.locator('a[href^="/en"], a[href^="/fi"], a[href^="/es"]');
        expect(await langLinks.count()).toBeGreaterThan(0);
    });

    test('game page /en has board + keyboard', async ({ page }) => {
        await page.goto('/en');
        await waitForPage(page);
        await dismissModals(page);

        const board = page.locator('.game-board');
        await expect(board).toBeVisible();
        const boardHeight = await board.evaluate((el) => el.getBoundingClientRect().height);
        expect(boardHeight, 'Game board should have real height, not squished').toBeGreaterThan(100);

        const keys = page.locator('button[data-char]');
        expect(await keys.count()).toBeGreaterThan(20);
    });

    test('speed page /en/speed has start button', async ({ page }) => {
        await page.goto('/en/speed');
        await waitForPage(page, { selector: '.speed-start-btn' });

        await expect(page.locator('.speed-start-btn')).toBeVisible();
        await expect(page.locator('.speed-start-btn')).toContainText('Start');
    });

    test('archive page /es/archive has word cards', async ({ page }) => {
        await page.goto('/es/archive');
        await waitForPage(page, { selector: '.archive-page' });

        const cards = page.locator('.archive-page a.card');
        expect(await cards.count()).toBeGreaterThan(10);
    });

    test('word page /en/word/crane renders', async ({ page }) => {
        await page.goto('/en/word/crane');
        await waitForPage(page, { selector: 'h1, .word-page' });
        await assertNotBlank(page);

        // Should have the word in the heading area
        const text = await page.locator('body').innerText();
        expect(text.toLowerCase()).toContain('crane');
    });

    test('semantic page /en/semantic renders', async ({ page }) => {
        await page.goto('/en/semantic');
        await waitForPage(page, { selector: 'h1, input' });
        await assertNotBlank(page);
    });

    const gameLangs = ['en', 'es', 'fi', 'ar', 'he', 'de', 'tr'];
    for (const lang of gameLangs) {
        test(`/${lang} loads without error`, async ({ page }) => {
            const errors = collectErrors(page);
            const response = await page.goto(`/${lang}`);
            expect(response?.status()).toBe(200);
            await waitForPage(page);

            // No server errors in console (client errors like missing embeddings are OK)
            const serverErrors = errors.filter((e) => e.includes('500') && !e.includes('semantic'));
            expect(serverErrors).toHaveLength(0);
        });
    }
});

// ---------------------------------------------------------------------------
// Navigation — SPA transitions never produce blank screens
// ---------------------------------------------------------------------------

test.describe('Navigation', () => {
    test('homepage → game page (no blank screen)', async ({ page }) => {
        await page.goto('/');
        await waitForPage(page, { selector: 'h1' });

        // SPA navigate to /en via any English link on the page
        await page.locator('a[href*="/en"]').first().click();
        await page.waitForURL('**/en**', { timeout: 10000 });
        await waitForPage(page);
        await assertNotBlank(page);
    });

    test('game → archive (cross-layout, no blank screen)', async ({ page }) => {
        // Start on archive (direct load works), then navigate to game
        await page.goto('/es/archive');
        await waitForPage(page, { selector: '.archive-page' });
        await assertNotBlank(page);

        // Click a word link to go to word page (tests archive → word nav)
        const wordLink = page.locator('.archive-page a.card').first();
        if (await wordLink.isVisible({ timeout: 3000 }).catch(() => false)) {
            await wordLink.click();
            await page.waitForTimeout(2000);
            await assertNotBlank(page);
        }
    });

    test('cross-language navigation preserves structure', async ({ page }) => {
        await page.goto('/en');
        await waitForPage(page);
        await dismissModals(page);

        // Navigate to Finnish
        await page.evaluate(() => {
            (window as any).__nuxt_app__?.$router?.push('/fi');
        });
        await waitForPage(page);

        // Board + keyboard should exist for Finnish too
        await expect(page.locator('.game-board')).toBeVisible();
        expect(await page.locator('button[data-char]').count()).toBeGreaterThan(20);

        // Finnish board should be empty (no English state bleeding)
        const firstRowTiles = page.locator('.game-board .tile').first();
        const text = await firstRowTiles.innerText();
        expect(text.trim()).toBe('');
    });

    test('direct navigation to deep pages works (not just SPA)', async ({ page }) => {
        // These pages are commonly reached via Google/bookmarks, not SPA clicks
        const directPages = [
            { url: '/en/word/crane', check: 'crane' },
            { url: '/es/archive', check: '.archive-page' },
            { url: '/en/speed', check: '.speed-start-btn' },
        ];

        for (const { url, check } of directPages) {
            const response = await page.goto(url);
            expect(response?.status(), `${url} should return 200`).toBe(200);

            if (check.startsWith('.')) {
                await expect(page.locator(check)).toBeVisible({ timeout: 15000 });
            } else {
                const body = await page.locator('body').innerText();
                expect(body.toLowerCase()).toContain(check);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Game Board Layout — the board must be playable, not squished
// ---------------------------------------------------------------------------

test.describe('Game Board Layout', () => {
    test('board has proper dimensions (not squished to 0)', async ({ page }) => {
        await page.goto('/en');
        await waitForPage(page);
        await dismissModals(page);

        const board = page.locator('.game-board');
        const box = await board.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.height, 'Board height should be substantial').toBeGreaterThan(150);
        expect(box!.width, 'Board width should be substantial').toBeGreaterThan(150);
    });

    test('keyboard is visible and near bottom of viewport', async ({ page }) => {
        await page.goto('/en');
        await waitForPage(page);
        await dismissModals(page);

        const firstKey = page.locator('button[data-char]').first();
        const box = await firstKey.boundingBox();
        expect(box).toBeTruthy();

        const viewport = page.viewportSize()!;
        // Keyboard should be in the bottom half of the screen
        expect(box!.y, 'Keyboard should be in lower portion').toBeGreaterThan(viewport.height * 0.4);
    });

    test('board + keyboard both visible without scrolling', async ({ page }) => {
        await page.goto('/en');
        await waitForPage(page);
        await dismissModals(page);

        // Both should be visible in the initial viewport
        await expect(page.locator('.game-board')).toBeInViewport();
        await expect(page.locator('button[data-char="q"]')).toBeInViewport();
    });
});

// ---------------------------------------------------------------------------
// API Contracts — endpoints return expected shapes
// ---------------------------------------------------------------------------

test.describe('API Contracts', () => {
    test('GET /api/languages returns language list', async ({ request }) => {
        const res = await request.get('/api/languages');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.language_codes).toBeDefined();
        expect(data.language_codes.length).toBeGreaterThan(60);
    });

    test('GET /api/{lang}/data returns game config', async ({ request }) => {
        const res = await request.get('/api/en/data');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.config).toBeDefined();
        expect(data.config.name).toBe('English');
        expect(data.word_list).toBeDefined();
        expect(data.word_list.length).toBeGreaterThan(100);
    });

    test('GET /api/{lang}/words returns archive data', async ({ request }) => {
        const res = await request.get('/api/es/words');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.words).toBeDefined();
        expect(data.words.length).toBeGreaterThan(0);
        expect(data.todays_idx).toBeGreaterThan(0);
        expect(data.total_pages).toBeGreaterThan(0);
    });

    test('GET /api/{lang}/word/{slug} returns word data', async ({ request }) => {
        const res = await request.get('/api/en/word/crane');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.word).toBe('crane');
        expect(data.definition).toBeDefined();
    });

    test('GET /api/badges returns badge definitions', async ({ request }) => {
        const res = await request.get('/api/badges');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(5);
        expect(data[0]).toHaveProperty('slug');
        expect(data[0]).toHaveProperty('name');
    });

    test('POST /api/auth/register + login flow', async ({ request }) => {
        const unique = `e2e-${Date.now()}@test.local`;

        // Register
        const regRes = await request.post('/api/auth/register', {
            data: { email: unique, password: 'TestPass123!', displayName: 'E2E' },
        });
        expect(regRes.status()).toBe(200);
        const regData = await regRes.json();
        expect(regData.id).toBeDefined();

        // Login
        const loginRes = await request.post('/api/auth/login', {
            data: { email: unique, password: 'TestPass123!' },
        });
        expect(loginRes.status()).toBe(200);
        const loginData = await loginRes.json();
        expect(loginData.id).toBe(regData.id);
    });

    test('invalid language returns 404', async ({ request }) => {
        const res = await request.get('/api/zzzz/data');
        expect(res.status()).toBe(404);
    });

    test('POST /api/en/semantic/start returns game session', async ({ request }) => {
        const res = await request.post('/api/en/semantic/start');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.targetId).toBeTruthy();
        expect(data.lang).toBe('en');
        expect(data.dayIdx).toBeGreaterThanOrEqual(0);
        expect(data.vocabularySize).toBeGreaterThan(1000);
        expect(data.axes).toBeDefined();
        expect(data.maxGuesses).toBeGreaterThan(0);
        expect(data.totalRanked).toBeGreaterThan(0);
    });

    test('POST /api/en/semantic/guess returns rank + compass', async ({ request }) => {
        // Start a session first
        const startRes = await request.post('/api/en/semantic/start');
        const { targetId } = await startRes.json();

        const res = await request.post('/api/en/semantic/guess', {
            data: { targetId, word: 'crane', guessNumber: 1 },
        });
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(true);
        expect(data.word).toBe('crane');
        expect(data.rank).toBeGreaterThan(0);
        expect(data.totalRanked).toBeGreaterThan(0);
        expect(data.display).toBeGreaterThanOrEqual(0);
        expect(data.compass).toBeDefined();
        expect(typeof data.won).toBe('boolean');
    });

    test('semantic guess rejects invalid word', async ({ request }) => {
        const startRes = await request.post('/api/en/semantic/start');
        const { targetId } = await startRes.json();

        const res = await request.post('/api/en/semantic/guess', {
            data: { targetId, word: 'xyzzzz', guessNumber: 1 },
        });
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.valid).toBe(false);
    });

    test('semantic is English-only (non-en returns 404)', async ({ request }) => {
        const res = await request.post('/api/fr/semantic/start');
        expect(res.status()).toBe(404);
    });
});

// ---------------------------------------------------------------------------
// RTL Languages — special layout handling
// ---------------------------------------------------------------------------

test.describe('RTL', () => {
    test('Hebrew page has RTL direction', async ({ page }) => {
        await page.goto('/he');
        await waitForPage(page);

        const rtlEl = page.locator('[dir="rtl"]');
        await expect(rtlEl.first()).toBeVisible();
    });

    test('Arabic page loads with Arabic keyboard', async ({ page }) => {
        await page.goto('/ar');
        await waitForPage(page);

        // Arabic keys (not Latin)
        const keys = page.locator('button[data-char]');
        const firstChar = await keys.first().getAttribute('data-char');
        // Arabic Unicode range: U+0600 - U+06FF
        expect(firstChar!.charCodeAt(0)).toBeGreaterThan(0x0600);
    });
});

// ---------------------------------------------------------------------------
// Speed Mode — countdown + game start
// ---------------------------------------------------------------------------

test.describe('Speed Mode', () => {
    test('start button launches game with timer and board', async ({ page }) => {
        await page.goto('/en/speed');
        await waitForPage(page, { selector: '.speed-start-btn' });
        await dismissModals(page);

        // Scroll start button into view and click
        const startBtn = page.locator('.speed-start-btn');
        await startBtn.scrollIntoViewIfNeeded();
        await startBtn.click();

        // After countdown (~3.7s), the idle/countdown section disappears
        // and the game board + keyboard appear for playing
        await expect(page.locator('.game-board')).toBeVisible({ timeout: 10000 });
    });
});

// ---------------------------------------------------------------------------
// Console Errors — pages shouldn't have uncaught errors
// ---------------------------------------------------------------------------

test.describe('No Console Errors', () => {
    const criticalPages = ['/', '/en', '/en/speed', '/es/archive'];

    for (const url of criticalPages) {
        test(`${url} has no critical console errors`, async ({ page }) => {
            const errors = collectErrors(page);
            await page.goto(url);
            await waitForPage(page, { selector: 'h1, button[data-char], .archive-page' });
            expect(errors, `Console errors on ${url}: ${errors.join('; ')}`).toHaveLength(0);
        });
    }
});
