/**
 * E2E test: per-game sync to database.
 *
 * Uses the dev-login endpoint to authenticate, plays a game,
 * and verifies the result appears in the database.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const DB_URL = process.env.DATABASE_URL || '';

test.describe('Game sync', () => {
    test('playing a game while logged in syncs the result to the database', async ({ page }) => {
        // Capture console for debugging
        const consoleLogs: string[] = [];
        page.on('console', (msg) => {
            if (msg.text().includes('[sync]')) consoleLogs.push(msg.text());
        });

        // Step 1: Dev login
        await page.goto(`${BASE}/api/auth/dev-login`);
        await page.waitForURL(`${BASE}/`);

        // Verify we're logged in (profile link should exist)
        await page.goto(`${BASE}/fi`);
        await page.waitForLoadState('networkidle');

        // Step 2: Get the target word from the game store
        const target = await page.evaluate(() => {
            const pinia = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config
                ?.globalProperties?.$pinia;
            const game = pinia?._s?.get('game');
            return game?.boards?.[0]?.targetWord;
        });
        expect(target).toBeTruthy();
        console.log('Target word:', target);

        // Verify game is not over yet
        const gameOverBefore = await page.evaluate(() => {
            const pinia = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config
                ?.globalProperties?.$pinia;
            return pinia?._s?.get('game')?.gameOver;
        });
        expect(gameOverBefore).toBe(false);

        // Step 3: Type the target word via the on-screen keyboard
        for (const ch of target!) {
            await page.evaluate((char) => {
                const pinia = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config
                    ?.globalProperties?.$pinia;
                pinia._s.get('game').keyClick(char);
            }, ch);
        }

        // Submit
        await page.evaluate(() => {
            const pinia = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config
                ?.globalProperties?.$pinia;
            pinia._s.get('game').keyClick('⇨');
        });

        // Wait for animation + sync
        await page.waitForTimeout(6000);

        // Step 4: Verify game is over
        const gameState = await page.evaluate(() => {
            const pinia = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config
                ?.globalProperties?.$pinia;
            const game = pinia?._s?.get('game');
            return { gameOver: game?.gameOver, gameWon: game?.gameWon };
        });
        expect(gameState.gameOver).toBe(true);
        expect(gameState.gameWon).toBe(true);

        // Step 5: Verify the result was synced to the server
        // Check via the API (using the same session cookie)
        const statsResponse = await page.evaluate(async () => {
            const res = await fetch('/api/user/stats');
            return res.json();
        });

        const fiResults = statsResponse.results?.filter(
            (r: any) => r.lang === 'fi' && r.mode === 'classic' && r.playType === 'daily'
        );
        console.log('Finnish daily results:', fiResults?.length);
        console.log('Sync console logs:', consoleLogs);
        expect(fiResults?.length).toBeGreaterThanOrEqual(1);

        // The most recent result should be today's game
        const latest = fiResults?.[fiResults.length - 1];
        expect(latest?.won).toBe(true);
        expect(latest?.attempts).toBe(1);
    });
});
