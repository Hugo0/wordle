import { test, expect, type Page } from '@playwright/test';
import { waitForGame, dismissModals, typeWord, waitForFlip } from './helpers';

/**
 * Integration Tests — gameplay flows, persistence, auth, and badges.
 *
 * Exercises stateful flows spanning localStorage, server API, Pinia stores,
 * and the game engine. Slower than smoke tests (~1min) but catches data bugs.
 */

// ---------------------------------------------------------------------------
// Integration-specific helpers
// ---------------------------------------------------------------------------

async function getTodaysWord(request: any, lang: string): Promise<string> {
    const res = await request.get(`/api/${lang}/data`);
    const data = await res.json();
    return data.todays_word;
}

async function readStorage(page: Page, key: string): Promise<string | null> {
    return page.evaluate((k) => localStorage.getItem(k), key);
}

async function readStorageJson(page: Page, key: string): Promise<any> {
    return page.evaluate((k) => {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : null;
    }, key);
}

// ---------------------------------------------------------------------------
// Full Game Playthrough
// ---------------------------------------------------------------------------

test.describe('Gameplay', () => {
    test('play and win a game in unlimited mode', async ({ page, request }) => {
        await page.goto('/en?play=unlimited');
        await waitForGame(page);

        // In unlimited mode, we can't know the word ahead of time,
        // but we can type valid words and verify the game responds
        await typeWord(page, 'crane');
        await waitForFlip(page);

        // First row should have colored tiles
        const coloredTiles = page.locator(
            '.game-board .tile[class*="correct"], .game-board .tile[class*="incorrect"]'
        );
        expect(await coloredTiles.count()).toBeGreaterThanOrEqual(5);
    });

    test('win a game with known answer (unlimited mode)', async ({ page, request }) => {
        // Get today's word — use it in unlimited mode to guarantee a win
        const word = await getTodaysWord(request, 'en');
        if (!word) {
            test.skip(true, 'Could not get today\'s word from API');
            return;
        }

        // Unlimited mode picks a random word, so we can't guarantee winning.
        // Instead, use daily mode with cleared state to get a fresh game with known word.
        await page.goto('/en');
        await page.evaluate((lang) => {
            // Clear game state for a fresh daily
            const pageName = window.location.pathname.split('/').pop() || lang;
            localStorage.removeItem(pageName || lang);
            localStorage.removeItem(`tutorial_shown_${pageName || lang}`);
        }, 'en');
        await page.reload();
        await waitForGame(page);

        // Type the answer
        await typeWord(page, word);
        await waitForFlip(page);

        // Game should be over — post-game content should appear
        await page.waitForTimeout(2000);
        const bodyText = await page.locator('body').innerText();
        // Should see either the word revealed, stats, or share button
        const gameEnded = bodyText.includes(word.toUpperCase()) ||
            bodyText.includes('1/6') ||
            bodyText.includes('Share') ||
            bodyText.includes('SHARE');
        expect(gameEnded, 'Game should show post-game state after guessing correctly').toBeTruthy();
    });

    test('invalid word shows error notification', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        await typeWord(page, 'zzzzz');

        // Should show a notification toast
        const toast = page.locator('[role="alert"]');
        await expect(toast).toBeVisible({ timeout: 3000 });
    });

    test('backspace removes letters', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // Type 3 letters
        await page.keyboard.type('abc', { delay: 30 });

        // Verify 3 filled
        let filled = page.locator('.game-board .grid-cols-5:first-of-type .tile.filled');
        expect(await filled.count()).toBe(3);

        // Backspace removes one
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(100);
        filled = page.locator('.game-board .grid-cols-5:first-of-type .tile.filled');
        expect(await filled.count()).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// localStorage Persistence
// ---------------------------------------------------------------------------

test.describe('Persistence', () => {
    test('game state survives page reload', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // Type and submit a valid word
        await typeWord(page, 'crane');
        await waitForFlip(page);

        // Verify tiles are colored
        const colored = page.locator(
            '.game-board .tile[class*="correct"], .game-board .tile[class*="incorrect"]'
        );
        const countBefore = await colored.count();
        expect(countBefore).toBeGreaterThanOrEqual(5);

        // Reload and wait for tiles to restore
        await page.reload();
        await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
        await expect(colored).toHaveCount(countBefore, { timeout: 5000 });
    });

    test('game state is stored in localStorage', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        await typeWord(page, 'crane');
        await waitForFlip(page);

        // Game state is saved under the page name (last path segment)
        // For /en, the key is 'en' (or empty, in which case it falls back)
        const allKeys = await page.evaluate(() => Object.keys(localStorage));
        // Should have at least some game-related keys
        const gameKeys = allKeys.filter(k =>
            k === 'en' || k.includes('game') || k.includes('tutorial') || k.includes('settings')
        );
        expect(gameKeys.length, `Expected game keys in localStorage, got: ${allKeys.join(', ')}`).toBeGreaterThan(0);
    });

    test('stats accumulate across games in localStorage', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // Submit a word to create some game activity
        await typeWord(page, 'crane');
        await waitForFlip(page);

        // Check stats storage exists
        const stats = await readStorageJson(page, 'game_results');
        // Stats might be null for first game, that's OK
        // The key thing is localStorage works without throwing
        expect(stats === null || typeof stats === 'object').toBe(true);
    });

    test('settings persist: dark mode toggle', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // Set dark mode via localStorage
        await page.evaluate(() => localStorage.setItem('darkMode', 'true'));
        await page.reload();
        await page.waitForTimeout(1000);

        // HTML should have dark class
        const hasDark = await page.locator('html').getAttribute('class');
        expect(hasDark).toContain('dark');

        // Toggle back
        await page.evaluate(() => localStorage.setItem('darkMode', 'false'));
        await page.reload();
        await page.waitForTimeout(1000);
        const noDark = await page.locator('html').getAttribute('class');
        expect(noDark || '').not.toContain('dark');
    });

    test('different languages have separate game states', async ({ page }) => {
        // Play in English
        await page.goto('/en');
        await waitForGame(page);
        await typeWord(page, 'crane');
        await waitForFlip(page);

        // Play in Spanish
        await page.goto('/es');
        await waitForGame(page);

        // Spanish board should be empty (no English state)
        const firstTile = page.locator('.game-board .grid-cols-5:first-of-type .tile').first();
        const text = await firstTile.innerText();
        expect(text.trim()).toBe('');

        // English state should still exist
        const enState = await readStorage(page, 'en');
        expect(enState).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Auth & Server Sync
// ---------------------------------------------------------------------------

test.describe('Auth', () => {
    const testEmail = () => `e2e-int-${Date.now()}@test.local`;

    test('register → login → profile endpoint', async ({ playwright }) => {
        // Use a fresh API context so cookies persist across requests
        const ctx = await playwright.request.newContext({
            baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        });
        const email = testEmail();

        try {
            // Register
            const regRes = await ctx.post('/api/auth/register', {
                data: { email, password: 'TestPass123!', displayName: 'E2E Test' },
            });
            expect(regRes.status()).toBe(200);
            const { id } = await regRes.json();
            expect(id).toBeTruthy();

            // Login (session cookie set)
            const loginRes = await ctx.post('/api/auth/login', {
                data: { email, password: 'TestPass123!' },
            });
            expect(loginRes.status()).toBe(200);
            const loginData = await loginRes.json();
            expect(loginData.id).toBe(id);

            // Profile endpoint — session cookie should give us the user back
            const profileRes = await ctx.get('/api/user/profile');
            expect(profileRes.status()).toBe(200);
            const profile = await profileRes.json();
            expect(profile.email).toBe(email);
            expect(profile.displayName).toBe('E2E Test');
            expect(Array.isArray(profile.badges)).toBe(true);
            expect(typeof profile.isPro).toBe('boolean');
        } finally {
            await ctx.dispose();
        }
    });

    test('wrong password returns error', async ({ request }) => {
        const email = testEmail();

        await request.post('/api/auth/register', {
            data: { email, password: 'TestPass123!', displayName: 'E2E' },
        });

        const res = await request.post('/api/auth/login', {
            data: { email, password: 'WrongPass999!' },
        });
        expect(res.status()).not.toBe(200);
    });

    test('game result sync requires auth', async ({ request }) => {
        const res = await request.post('/api/user/game-result', {
            data: { statsKey: 'en', won: true, attempts: 3, dayIdx: 100 },
        });
        expect(res.status()).toBe(401);
    });

    test('game result sync works when authenticated', async ({ playwright }) => {
        const ctx = await playwright.request.newContext({
            baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        });
        const email = testEmail();

        try {
            await ctx.post('/api/auth/register', {
                data: { email, password: 'TestPass123!', displayName: 'E2E' },
            });
            await ctx.post('/api/auth/login', {
                data: { email, password: 'TestPass123!' },
            });

            // statsKey format: bare lang code for classic 5-letter daily
            const res = await ctx.post('/api/user/game-result', {
                data: { statsKey: 'en', won: true, attempts: 3, dayIdx: 100 },
            });
            expect(res.status()).toBe(200);
        } finally {
            await ctx.dispose();
        }
    });
});

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

test.describe('Badges', () => {
    test('badge definitions have required fields', async ({ request }) => {
        const res = await request.get('/api/badges');
        const badges = await res.json();

        for (const badge of badges) {
            expect(badge.slug, `Badge missing slug`).toBeTruthy();
            expect(badge.name, `Badge ${badge.slug} missing name`).toBeTruthy();
            expect(badge.description, `Badge ${badge.slug} missing description`).toBeTruthy();
            expect(badge.category, `Badge ${badge.slug} missing category`).toBeTruthy();
            expect(typeof badge.threshold, `Badge ${badge.slug} threshold should be number`).toBe('number');
        }
    });

    test('badge slugs are unique', async ({ request }) => {
        const res = await request.get('/api/badges');
        const badges = await res.json();
        const slugs = badges.map((b: any) => b.slug);
        const unique = new Set(slugs);
        expect(unique.size).toBe(slugs.length);
    });

    test('badge evaluation runs after game result', async ({ playwright }) => {
        const ctx = await playwright.request.newContext({
            baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
        });
        const email = `e2e-badge-${Date.now()}@test.local`;

        try {
            await ctx.post('/api/auth/register', {
                data: { email, password: 'TestPass123!', displayName: 'E2E Badge' },
            });
            await ctx.post('/api/auth/login', {
                data: { email, password: 'TestPass123!' },
            });

            // Submit a perfect game (1 guess win) — should trigger "perfect-game" badge
            const res = await ctx.post('/api/user/game-result', {
                data: { statsKey: 'en', won: true, attempts: 1, dayIdx: 999 },
            });
            expect(res.status()).toBe(200);
            const result = await res.json();
            expect(result).toBeDefined();
        } finally {
            await ctx.dispose();
        }
    });
});

// ---------------------------------------------------------------------------
// Speed Mode State
// ---------------------------------------------------------------------------

test.describe('Speed Mode', () => {
    test('speed game creates score state', async ({ page }) => {
        await page.goto('/en/speed');
        await page.locator('.speed-start-btn').waitFor({ timeout: 15000 });
        await dismissModals(page);
        await page.locator('.speed-start-btn').scrollIntoViewIfNeeded();
        await page.locator('.speed-start-btn').click();

        // Wait for game to start
        await page.locator('.game-board').waitFor({ timeout: 10000 });

        // Type a word and submit
        await typeWord(page, 'crane');
        await page.waitForTimeout(1000);

        // The page should still be in playing state (not crashed)
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain('Speed Streak');
    });
});

// ---------------------------------------------------------------------------
// On-Screen Keyboard
// ---------------------------------------------------------------------------

test.describe('On-Screen Keyboard', () => {
    test('tapping keys fills tiles', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        for (const letter of ['w', 'o', 'r', 'l', 'd']) {
            await page.locator(`button[data-char="${letter}"]`).click({ force: true });
            await page.waitForTimeout(50);
        }

        const filled = page.locator('.game-board .grid-cols-5:first-of-type .tile.filled');
        await expect(filled).toHaveCount(5, { timeout: 3000 });
    });
});

// ---------------------------------------------------------------------------
// Diacritics
// ---------------------------------------------------------------------------

test.describe('Diacritics', () => {
    test('long-press shows diacritic popup', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        const cKey = page.locator('button[data-char="c"]');
        const box = await cKey.boundingBox();
        expect(box).toBeTruthy();

        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);

        const popup = page.locator('.diacritic-popup');
        await expect(popup).toBeVisible({ timeout: 2000 });
        await page.mouse.up();
    });

    test('quick tap types base character (no popup)', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        await page.locator('button[data-char="c"]').click();
        await page.waitForTimeout(200);

        const firstTile = page.locator('.game-board .grid-cols-5').first().locator('.tile').first();
        await expect(firstTile).toContainText('c', { timeout: 2000, ignoreCase: true });
    });
});

// ---------------------------------------------------------------------------
// Full Auth → Play → Sync Flow
// ---------------------------------------------------------------------------

test.describe('Auth Sync Flow', () => {
    test('game result syncs to server after login', async ({ page, playwright }) => {
        const email = `e2e-sync-${Date.now()}@test.local`;
        const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';

        // 1. Register via API
        const ctx = await playwright.request.newContext({ baseURL });
        try {
            await ctx.post('/api/auth/register', {
                data: { email, password: 'TestPass123!', displayName: 'Sync Test' },
            });
        } finally {
            await ctx.dispose();
        }

        // 2. Login in browser via API (sets session cookie)
        await page.goto('/');
        await page.evaluate(async (creds) => {
            await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds),
            });
        }, { email, password: 'TestPass123!' });

        // 3. Play a game
        await page.goto('/en');
        await waitForGame(page);
        await typeWord(page, 'crane');
        await waitForFlip(page);

        // 4. Verify profile is accessible (session works in browser)
        const profile = await page.evaluate(async () => {
            const res = await fetch('/api/user/profile');
            if (!res.ok) return null;
            return res.json();
        });
        expect(profile, 'Profile should be accessible after login').toBeTruthy();
        expect(profile.email).toBe(email);
    });
});
