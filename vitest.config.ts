import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { type Plugin } from 'vite';

/**
 * Vite plugin that replaces `import.meta.client` → `true` and
 * `import.meta.server` → `false`, mimicking what Nuxt does at build time.
 */
function nuxtMetaPlugin(): Plugin {
    return {
        name: 'vitest-nuxt-meta',
        enforce: 'pre',
        transform(code, id) {
            if (id.includes('node_modules')) return;
            if (!code.includes('import.meta.client') && !code.includes('import.meta.server'))
                return;
            return code
                .replace(/import\.meta\.client/g, '(true)')
                .replace(/import\.meta\.server/g, '(false)');
        },
    };
}

/**
 * IMPORTANT: Do NOT add Prisma workarounds to nuxt.config.ts.
 *
 * We tried externalizing @prisma/client and @prisma/adapter-pg via
 * nuxt.config.ts → nitro.rollupConfig.external. This fixed vitest/CI
 * but broke production on Render — the adapter and client loaded as
 * separate runtime modules that couldn't communicate, causing
 * ECONNREFUSED on every DB query even though the pool connected at
 * startup. Debugging this took hours (2026-04-11).
 *
 * Rule: vitest import issues stay in vitest.config.ts. Never change
 * Nitro bundling config to fix CI — they are different environments.
 */
export default defineConfig({
    test: {
        environment: 'jsdom',
        exclude: ['**/node_modules/**', '**/e2e/**', '**/.claude/worktrees/**'],
        globalSetup: ['./tests/setup-server.ts'],
    },
    resolve: {
        alias: {
            '~': resolve(__dirname, '.'),
            '@': resolve(__dirname, '.'),
            // @vue/reactivity is used by game store for pauseTracking/resetTracking.
            // pnpm hoisting varies between local and CI — try both locations.
            '@vue/reactivity': resolve(__dirname, 'node_modules/@vue/reactivity'),
        },
    },
    plugins: [nuxtMetaPlugin()],
});
