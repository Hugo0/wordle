import { expect, type Page } from '@playwright/test';

/** Wait for page to be interactive — keyboard visible or main content loaded */
export async function waitForPage(page: Page, opts?: { selector?: string }) {
    const sel = opts?.selector ?? 'button[data-char], .archive-page, .word-page, h1';
    await page.locator(sel).first().waitFor({ timeout: 15000 });
}

/** Dismiss any open modals (tutorial, stats, help) */
export async function dismissModals(page: Page) {
    for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
    }
}

/** Wait for keyboard + dismiss modals — used by gameplay tests */
export async function waitForGame(page: Page) {
    await page.locator('button[data-char]').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await dismissModals(page);
}

/** Assert page is NOT blank — has real content, not just a background div */
export async function assertNotBlank(page: Page) {
    const textLen = await page.evaluate(() => document.body.innerText.trim().length);
    expect(textLen, 'Page should have visible text content').toBeGreaterThan(50);
}

/** Collect console errors, filtering known noise (CORS, extensions, favicon) */
export function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (text.includes('CORS')) return;
            if (text.includes('favicon')) return;
            if (text.includes('extension')) return;
            if (text.includes('semantic') && text.includes('500')) return;
            if (text.includes('word-explore') && text.includes('500')) return;
            errors.push(text);
        }
    });
    return errors;
}

/** Type a word using the physical keyboard and submit */
export async function typeWord(page: Page, word: string) {
    await page.keyboard.type(word, { delay: 30 });
    await page.keyboard.press('Enter');
}

/** Wait for tile flip animation to complete (all 5 tiles in a row) */
export async function waitForFlip(page: Page) {
    // Wait for at least 5 colored tiles — the stagger animation reveals them sequentially
    await expect(
        page.locator('.game-board .tile[class*="correct"], .game-board .tile[class*="incorrect"]')
    ).toHaveCount(5, { timeout: 5000 }).catch(() => {});
}
