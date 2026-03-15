import { test, expect } from '@playwright/test';

/**
 * E2E Gameplay Tests for Wordle Global (Nuxt)
 *
 * Tests the full game flow: typing, submitting, winning, losing,
 * state persistence, and cross-language support.
 */

// Helper: clear game state, reload, wait for keyboard, close modals
async function waitForGame(page: import('@playwright/test').Page, opts?: { keepState?: boolean }) {
    if (!opts?.keepState) {
        // Clear game state for a fresh game
        await page.evaluate(() => {
            const pageName = window.location.pathname.split('/').pop() || 'home';
            localStorage.removeItem(pageName);
            localStorage.removeItem(`tutorial_shown_${pageName}`);
        });
        await page.reload();
    }
    await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
    // Wait for hydration + any auto-opening modals (tutorial, stats)
    await page.waitForTimeout(1000);
    // Close modals: press Escape repeatedly, then click backdrop as fallback
    for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    }
    const backdrop = page.locator('.fixed.bg-black');
    if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click({ force: true });
        await page.waitForTimeout(300);
    }
}

test.describe('Homepage', () => {
    test('loads and shows 65+ language cards', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Wordle/i);

        // Language cards are <button> elements inside the grid
        const cards = page.locator('button.group');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(65);
    });

    test('language search filters cards', async ({ page }) => {
        await page.goto('/');
        const search = page.locator('input[placeholder*="earch"]');
        await expect(search).toBeVisible({ timeout: 15000 });
        // Wait for cards to hydrate
        await expect(page.locator('button.group').first()).toBeVisible({ timeout: 10000 });

        await search.fill('Finnish');
        // Wait for filter to take effect — fewer cards visible
        await expect(page.locator('button.group')).not.toHaveCount(0, { timeout: 3000 });
        const count = await page.locator('button.group:visible').count();
        expect(count).toBeLessThan(65);
        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Game Page', () => {
    test('loads /en with keyboard and tiles', async ({ page }) => {
        await page.goto('/en');
        await expect(page).toHaveTitle(/Wordle/i);

        // Keyboard renders
        await expect(page.locator('button[data-char="q"]')).toBeVisible({ timeout: 15000 });

        // Game board has 6 rows × 5 tiles = 30 tile divs
        const tiles = page.locator('.game-board .inline-flex');
        await expect(tiles).toHaveCount(30);
    });

    test('type 5 letters via physical keyboard fills tiles', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        await page.keyboard.type('hello', { delay: 50 });

        // Filled tiles get border-neutral-500 class (active tile styling)
        const filledTiles = page.locator('.game-board .grid-cols-5:first-of-type [class*="border-neutral-500"]');
        await expect(filledTiles).toHaveCount(5, { timeout: 5000 });
    });

    test('type 5 letters via on-screen keyboard fills tiles', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        for (const letter of ['w', 'o', 'r', 'l', 'd']) {
            await page.locator(`button[data-char="${letter}"]`).click({ force: true });
            await page.waitForTimeout(100);
        }

        const filledTiles = page.locator('.game-board .grid-cols-5:first-of-type [class*="border-neutral-500"]');
        await expect(filledTiles).toHaveCount(5, { timeout: 5000 });
    });

    test('submit invalid word shows notification', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        await page.keyboard.type('zzzzz', { delay: 50 });
        await page.keyboard.press('Enter');

        // Notification toast: black rounded div with bold white text
        const toast = page.locator('.bg-black.rounded-lg p.font-bold.text-white');
        await expect(toast).toBeVisible({ timeout: 3000 });
    });

    test('submit valid word reveals tile colors', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // "crane" is always a valid English word
        await page.keyboard.type('crane', { delay: 50 });
        await page.keyboard.press('Enter');

        // Wait for flip animation to complete (~2.5s)
        await page.waitForTimeout(3000);

        // First row tiles get correct/semicorrect/incorrect in their class
        const coloredTiles = page.locator(
            '.game-board .grid-cols-5:first-of-type [class*="correct"], ' +
            '.game-board .grid-cols-5:first-of-type [class*="incorrect"]',
        );
        await expect(coloredTiles).toHaveCount(5, { timeout: 5000 });
    });
});

test.describe('Dark Mode', () => {
    test('system dark mode preference applies', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/en');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('light mode by default', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/en');
        const htmlClass = await page.locator('html').getAttribute('class');
        expect(htmlClass || '').not.toMatch(/dark/);
    });
});

test.describe('RTL Language', () => {
    test('Hebrew renders with RTL direction', async ({ page }) => {
        await page.goto('/he');
        await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });

        const rtl = page.locator('[dir="rtl"]');
        await expect(rtl.first()).toBeVisible();
    });

    test('Hebrew keyboard has Hebrew letters', async ({ page }) => {
        await page.goto('/he');
        const hebrewKeys = page.locator(
            'button[data-char="א"], button[data-char="ב"], button[data-char="ג"]',
        );
        await expect(hebrewKeys.first()).toBeVisible({ timeout: 15000 });
        expect(await hebrewKeys.count()).toBeGreaterThan(0);
    });
});

test.describe('Korean Keyboard', () => {
    test('Korean page loads with keyboard', async ({ page }) => {
        await page.goto('/ko');
        const keys = page.locator('button[data-char]');
        await expect(keys.first()).toBeVisible({ timeout: 15000 });
        expect(await keys.count()).toBeGreaterThan(10);
    });
});

test.describe('State Persistence', () => {
    test('reload mid-game restores tiles', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        // Submit a valid word
        await page.keyboard.type('crane', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // Verify tiles are colored
        const coloredBefore = page.locator(
            '.game-board .grid-cols-5:first-of-type [class*="correct"], ' +
            '.game-board .grid-cols-5:first-of-type [class*="incorrect"]',
        );
        await expect(coloredBefore).toHaveCount(5, { timeout: 5000 });

        // Reload
        await page.reload();
        await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(1000);

        // Tiles should still be colored after restore
        const coloredAfter = page.locator(
            '.game-board .grid-cols-5:first-of-type [class*="correct"], ' +
            '.game-board .grid-cols-5:first-of-type [class*="incorrect"]',
        );
        await expect(coloredAfter).toHaveCount(5, { timeout: 5000 });
    });
});

test.describe('Tutorial', () => {
    test('first visit shows help modal', async ({ browser }) => {
        // Use a fresh browser context with no storage to simulate first visit
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('/en');
        await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
        // Tutorial modal auto-opens on first visit — backdrop overlay becomes visible
        const backdrop = page.locator('.fixed.bg-black');
        await expect(backdrop).toBeVisible({ timeout: 5000 });
        await context.close();
    });
});

test.describe('Multi-language Loading', () => {
    const languages = ['es', 'fr', 'de', 'ar', 'ru', 'it', 'tr'];

    for (const lang of languages) {
        test(`${lang} game page loads`, async ({ page }) => {
            const response = await page.goto(`/${lang}`);
            expect(response?.status()).toBe(200);

            // Keyboard should render
            const keys = page.locator('button[data-char]');
            await expect(keys.first()).toBeVisible({ timeout: 15000 });
            expect(await keys.count()).toBeGreaterThan(10);
        });
    }
});
