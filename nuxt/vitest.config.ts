import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { type Plugin } from 'vite'

/**
 * Vite plugin that replaces `import.meta.client` → `true` and
 * `import.meta.server` → `false`, mimicking what Nuxt does at build time.
 */
function nuxtMetaPlugin(): Plugin {
    return {
        name: 'vitest-nuxt-meta',
        enforce: 'pre',
        transform(code, id) {
            if (id.includes('node_modules')) return
            if (!/\.[jt]sx?$/.test(id) && !id.endsWith('.vue')) return
            if (!code.includes('import.meta.client') && !code.includes('import.meta.server')) return
            return code
                .replace(/import\.meta\.client/g, '(true)')
                .replace(/import\.meta\.server/g, '(false)')
        },
    }
}

export default defineConfig({
    test: {
        environment: 'jsdom',
        exclude: ['**/node_modules/**', '**/e2e/**'],
        globalSetup: ['./tests/setup-server.ts'],
    },
    resolve: {
        alias: {
            '~': resolve(__dirname, '.'),
            '@': resolve(__dirname, '.'),
        },
    },
    plugins: [nuxtMetaPlugin()],
})
