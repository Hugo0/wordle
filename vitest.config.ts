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
