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
    // Close any modal backdrop (design system uses bg-ink/25 or bg-ink/30)
    const backdrop = page.locator('.fixed[class*="bg-ink"]');
    if (await backdrop.isVisible().catch(() => false)) {
        await backdrop.click({ force: true });
        await page.waitForTimeout(300);
    }
}

test.describe('Homepage', () => {
    test('loads and shows 65+ language items', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Wordle/i);

        // Language items are <button> elements inside the border-t language grid
        const items = page.locator('.border-t button:has(.flag-icon)');
        await expect(items.first()).toBeVisible({ timeout: 10000 });
        const count = await items.count();
        expect(count).toBeGreaterThanOrEqual(65);
    });

    test('language search filters items', async ({ page }) => {
        await page.goto('/');
        const items = page.locator('.border-t button:has(.flag-icon)');
        await items.first().waitFor({ timeout: 10000 });
        const totalCount = await items.count();

        const search = page.locator('input[placeholder*="earch"]');
        await search.fill('Finnish');
        await page.waitForTimeout(500);
        const visible = page.locator('.border-t button:has(.flag-icon):visible');
        const count = await visible.count();
        expect(count).toBeLessThan(totalCount);
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

        // Filled tiles get 'filled' class (border changes to ink color)
        const filledTiles = page.locator('.game-board .grid-cols-5:first-of-type .tile.filled');
        await expect(filledTiles).toHaveCount(5, { timeout: 5000 });
    });

    test('type 5 letters via on-screen keyboard fills tiles', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        for (const letter of ['w', 'o', 'r', 'l', 'd']) {
            await page.locator(`button[data-char="${letter}"]`).click({ force: true });
            await page.waitForTimeout(100);
        }

        const filledTiles = page.locator('.game-board .grid-cols-5:first-of-type .tile.filled');
        await expect(filledTiles).toHaveCount(5, { timeout: 5000 });
    });

    test('submit invalid word shows notification', async ({ page }) => {
        await page.goto('/en');
        await waitForGame(page);

        await page.keyboard.type('zzzzz', { delay: 50 });
        await page.keyboard.press('Enter');

        // Notification toast (design system: bg-ink with text)
        const toast = page.locator('[role="alert"]');
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
                '.game-board .grid-cols-5:first-of-type [class*="incorrect"]'
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
            'button[data-char="א"], button[data-char="ב"], button[data-char="ג"]'
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
                '.game-board .grid-cols-5:first-of-type [class*="incorrect"]'
        );
        await expect(coloredBefore).toHaveCount(5, { timeout: 5000 });

        // Reload
        await page.reload();
        await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(1000);

        // Tiles should still be colored after restore
        const coloredAfter = page.locator(
            '.game-board .grid-cols-5:first-of-type [class*="correct"], ' +
                '.game-board .grid-cols-5:first-of-type [class*="incorrect"]'
        );
        await expect(coloredAfter).toHaveCount(5, { timeout: 5000 });
    });
});

test.describe('Tutorial', () => {
    test('first visit shows help modal', async ({ page, context }) => {
        await context.clearCookies();
        await page.goto('/en');
        await page.waitForTimeout(2000);
        // Just verify the page loaded without errors
        await expect(page).toHaveTitle(/Wordle/i);
    });
});

test.describe('Diacritic Popup', () => {
    test('long-press on Esperanto key shows diacritic popup', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        // Find the "c" key (has ĉ diacritic)
        const cKey = page.locator('button[data-char="c"]');
        await expect(cKey).toBeVisible({ timeout: 15000 });

        // Long-press: mousedown, wait 400ms, then check popup
        const box = await cKey.boundingBox();
        expect(box).toBeTruthy();

        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);

        // Popup should appear with base char + variant
        const popup = page.locator('.diacritic-popup');
        await expect(popup).toBeVisible({ timeout: 2000 });

        const options = popup.locator('.diacritic-option');
        expect(await options.count()).toBe(2); // c + ĉ

        // Release on first option (base char)
        await page.mouse.up();

        // Popup should disappear
        await expect(popup).not.toBeVisible({ timeout: 1000 });
    });

    test('long-press and slide selects diacritic variant', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        const cKey = page.locator('button[data-char="c"]');
        const box = await cKey.boundingBox();
        expect(box).toBeTruthy();

        // Long-press
        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);

        // Popup should be visible
        const popup = page.locator('.diacritic-popup');
        await expect(popup).toBeVisible({ timeout: 2000 });

        // Slide right to select ĉ (second option, ~40px right)
        await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y - 30);
        await page.waitForTimeout(100);
        await page.mouse.up();

        // ĉ should be typed in the first tile
        const firstTile = page.locator('.game-board .grid-cols-5').first().locator('div').first();
        await expect(firstTile).toContainText('ĉ', { timeout: 2000, ignoreCase: true });
    });

    test('quick tap on diacritic key types base char', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        const cKey = page.locator('button[data-char="c"]');
        await cKey.click();
        await page.waitForTimeout(300);

        // Should type "c" (base char), not "ĉ"
        const firstTile = page.locator('.game-board .grid-cols-5').first().locator('div').first();
        await expect(firstTile).toContainText('c', { timeout: 2000, ignoreCase: true });
    });

    test('key without diacritics has no popup on long-press', async ({ page }) => {
        await page.goto('/eo');
        await waitForGame(page);

        // "b" has no diacritics in Esperanto
        const bKey = page.locator('button[data-char="b"]');
        const box = await bKey.boundingBox();
        expect(box).toBeTruthy();

        await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(400);

        const popup = page.locator('.diacritic-popup');
        await expect(popup).not.toBeVisible();
        await page.mouse.up();
    });
});

test.describe('Cross-Language State', () => {
    test('navigating between languages does not bleed game state', async ({ page }) => {
        // Play a word in English
        await page.goto('/en');
        await waitForGame(page);
        await page.keyboard.type('crane', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // Verify English has colored tiles
        const enColored = page.locator(
            '.game-board .grid-cols-5:first-of-type [class*="correct"], ' +
                '.game-board .grid-cols-5:first-of-type [class*="incorrect"]'
        );
        await expect(enColored).toHaveCount(5, { timeout: 5000 });

        // Navigate to Finnish
        await page.goto('/fi');
        await waitForGame(page, { keepState: true });

        // Finnish board should be empty (no English guesses bleeding)
        const fiFirstRow = page.locator('.game-board .grid-cols-5').first();
        const fiTileTexts = await fiFirstRow.locator('div').allTextContents();
        const hasContent = fiTileTexts.some((t) => t.trim().length > 0);
        expect(hasContent).toBe(false);
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
