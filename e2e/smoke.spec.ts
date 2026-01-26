import { test, expect } from "@playwright/test";

/**
 * Smoke tests for Wordle Global.
 *
 * These tests verify core functionality works end-to-end.
 * They should be fast and reliable.
 */

test.describe("Homepage", () => {
    test("loads and displays title", async ({ page }) => {
        await page.goto("/");

        // Page title should be set
        await expect(page).toHaveTitle(/Wordle/i);

        // Header should be visible
        const header = page.locator("h1");
        await expect(header).toContainText("WORDLE");
    });

    test("has language data loaded", async ({ page }) => {
        await page.goto("/");

        // Wait for page to fully load
        await page.waitForLoadState("domcontentloaded");

        // Check that window.languages is populated (backend data - it's a dict)
        const languageCount = await page.evaluate(() => {
            const langs = (window as any).languages;
            return langs ? Object.keys(langs).length : 0;
        });
        expect(languageCount).toBeGreaterThan(50);
    });
});

test.describe("Game Page", () => {
    test("loads English game page", async ({ page }) => {
        await page.goto("/en");

        // Page should have title
        await expect(page).toHaveTitle(/Wordle/i);

        // Should have game data loaded
        const todaysWord = await page.evaluate(() => {
            return (window as any).todays_word;
        });
        expect(todaysWord).toBeTruthy();
        expect(todaysWord.length).toBe(5);
    });

    test("has keyboard data", async ({ page }) => {
        await page.goto("/en");

        // Check keyboard is in page HTML (server-rendered)
        const keyboardHtml = await page.locator('[data-char="q"]').count();
        expect(keyboardHtml).toBeGreaterThan(0);
    });

    test("has correct character set", async ({ page }) => {
        await page.goto("/en");

        const characters = await page.evaluate(() => {
            return (window as any).characters;
        });
        expect(characters).toContain("a");
        expect(characters).toContain("z");
    });
});

test.describe("RTL Language", () => {
    test("Hebrew game loads", async ({ page }) => {
        await page.goto("/he");

        // Should have Hebrew word data
        const todaysWord = await page.evaluate(() => {
            return (window as any).todays_word;
        });
        expect(todaysWord).toBeTruthy();
        expect(todaysWord.length).toBe(5);
    });

    test("Hebrew has Hebrew keyboard keys", async ({ page }) => {
        await page.goto("/he");

        // Hebrew keyboard should have Hebrew letters in HTML
        const hebrewKeyCount = await page
            .locator('[data-char="א"], [data-char="ב"], [data-char="ג"]')
            .count();
        expect(hebrewKeyCount).toBeGreaterThan(0);
    });
});

test.describe("Dark Mode", () => {
    test("respects system dark mode preference", async ({ page }) => {
        // Emulate dark mode preference
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto("/en");

        // HTML element should have dark class (set by inline script)
        const html = page.locator("html");
        await expect(html).toHaveClass(/dark/);
    });

    test("light mode by default", async ({ page }) => {
        await page.emulateMedia({ colorScheme: "light" });
        await page.goto("/en");

        // HTML should not have dark class
        const htmlClass = await page.locator("html").getAttribute("class");
        expect(htmlClass).not.toMatch(/dark/);
    });
});

test.describe("Mobile Viewport", () => {
    test("page loads on mobile", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/en");

        // Keyboard keys should be present
        const keyCount = await page.locator('[data-char="q"]').count();
        expect(keyCount).toBeGreaterThan(0);
    });
});

test.describe("Multiple Languages", () => {
    const languages = ["en", "es", "fr", "de", "it", "ru", "he", "ar"];

    for (const lang of languages) {
        test(`${lang} game page loads`, async ({ page }) => {
            await page.goto(`/${lang}`);

            // Should have valid game data
            const todaysWord = await page.evaluate(() => {
                return (window as any).todays_word;
            });
            expect(todaysWord).toBeTruthy();
            expect(todaysWord.length).toBe(5);
        });
    }
});
