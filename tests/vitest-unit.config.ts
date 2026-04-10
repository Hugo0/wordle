/**
 * Minimal vitest config for pure-function unit tests that don't need
 * a running Nuxt server. Use: npx vitest run --config tests/vitest-unit.config.ts
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        include: ['tests/day-index.test.ts', 'tests/game-modes.test.ts', 'tests/stats-key-parser.test.ts'],
        environment: 'node',
    },
    resolve: {
        alias: {
            '~': resolve(__dirname, '..'),
            '@': resolve(__dirname, '..'),
        },
    },
});
