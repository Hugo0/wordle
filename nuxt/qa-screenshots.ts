/**
 * QA Screenshot Script
 * Takes screenshots of every page and reports console errors.
 * Run: npx tsx qa-screenshots.ts
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = './qa-screenshots';

const PAGES = [
    { name: '01-homepage', url: '/', wait: 2000 },
    { name: '02-game-en', url: '/en', wait: 3000 },
    { name: '03-game-fi', url: '/fi', wait: 2000 },
    { name: '04-game-he-rtl', url: '/he', wait: 2000 },
    { name: '05-game-ar-rtl', url: '/ar', wait: 2000 },
    { name: '06-words-en', url: '/en/words', wait: 2000 },
    { name: '07-word-detail', url: '/en/word/1720', wait: 2000 },
    { name: '08-word-today', url: '/en/word/1729', wait: 2000 },
    { name: '09-stats', url: '/stats', wait: 2000 },
    { name: '10-homepage-dark', url: '/', wait: 2000, dark: true },
    { name: '11-game-en-dark', url: '/en', wait: 2000, dark: true },
];

async function run() {
    mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const page of PAGES) {
        console.log(`\n=== ${page.name} (${page.url}) ===`);

        const context = await browser.newContext({
            viewport: { width: 390, height: 844 }, // iPhone 14 size
            colorScheme: page.dark ? 'dark' : 'light',
        });

        if (page.dark) {
            await context.addInitScript(() => {
                localStorage.setItem('darkMode', 'true');
            });
        }

        const p = await context.newPage();
        const pageErrors: string[] = [];
        const pageWarnings: string[] = [];

        p.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (!text.includes('favicon') && !text.includes('DevTools')) {
                    pageErrors.push(text);
                }
            }
            if (msg.type() === 'warning') {
                const text = msg.text();
                if (text.includes('Failed to resolve') || text.includes('missing template')) {
                    pageWarnings.push(text);
                }
            }
        });

        p.on('pageerror', (err) => {
            pageErrors.push(`PAGE ERROR: ${err.message}`);
        });

        try {
            const response = await p.goto(`${BASE}${page.url}`, { waitUntil: 'networkidle', timeout: 15000 });
            console.log(`  Status: ${response?.status()}`);

            await p.waitForTimeout(page.wait);

            await p.screenshot({
                path: `${OUT}/${page.name}.png`,
                fullPage: true,
            });
            console.log(`  Screenshot: ${OUT}/${page.name}.png`);

            if (pageErrors.length > 0) {
                console.log(`  ERRORS (${pageErrors.length}):`);
                for (const e of pageErrors.slice(0, 5)) {
                    console.log(`    - ${e.substring(0, 200)}`);
                    errors.push(`[${page.name}] ${e.substring(0, 200)}`);
                }
            }
            if (pageWarnings.length > 0) {
                console.log(`  WARNINGS (${pageWarnings.length}):`);
                for (const w of pageWarnings.slice(0, 3)) {
                    console.log(`    - ${w.substring(0, 200)}`);
                    warnings.push(`[${page.name}] ${w.substring(0, 200)}`);
                }
            }
            if (pageErrors.length === 0 && pageWarnings.length === 0) {
                console.log(`  ✓ Clean`);
            }
        } catch (err: any) {
            console.log(`  FAILED: ${err.message}`);
            errors.push(`[${page.name}] Navigation failed: ${err.message}`);
        }

        await context.close();
    }

    await browser.close();

    console.log('\n\n========== QA SUMMARY ==========');
    console.log(`Pages tested: ${PAGES.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
        console.log('\nAll Errors:');
        for (const e of errors) console.log(`  ✗ ${e}`);
    }
    if (warnings.length > 0) {
        console.log('\nAll Warnings:');
        for (const w of warnings) console.log(`  ⚠ ${w}`);
    }
    if (errors.length === 0 && warnings.length === 0) {
        console.log('\n✓ All pages clean — no errors or component warnings');
    }
}

run().catch(console.error);
