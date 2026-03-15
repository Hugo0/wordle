import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    compatibilityDate: '2025-06-14',
    devtools: { enabled: true },

    modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],

    css: ['~/assets/css/main.css'],

    vite: {
        plugins: [tailwindcss()],
    },

    // Resolve data directory: webapp/data/ relative to project root
    runtimeConfig: {
        dataDir: process.env.DATA_DIR || '',
        webappDataDir: '', // Set in nitro plugin at startup
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        wordImagesDir: '',
        wordDefsDir: '',
        wordStatsDir: '',
        wordHistoryDir: '',
    },

    nitro: {
        // Pre-load data at startup
        preset: 'node-server',
    },

    app: {
        head: {
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon/favicon.ico' },
                {
                    rel: 'apple-touch-icon',
                    sizes: '180x180',
                    href: '/favicon/apple-touch-icon.png',
                },
            ],
        },
    },

    pwa: {
        registerType: 'autoUpdate',
        scope: '/',
        manifest: {
            name: 'Wordle Global',
            short_name: 'Wordle',
            description: 'Daily word puzzle game in 65+ languages',
            start_url: '/',
            display: 'standalone',
            background_color: '#ffffff',
            theme_color: '#ffffff',
            orientation: 'portrait',
            categories: ['games', 'entertainment', 'education'],
            icons: [
                {
                    src: '/favicon/android-chrome-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                },
                {
                    src: '/favicon/android-chrome-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                },
                {
                    src: '/favicon/apple-touch-icon.png',
                    sizes: '180x180',
                    type: 'image/png',
                    purpose: 'any',
                },
            ],
        },
        workbox: {
            // Cache versioning: changing this name will invalidate old caches
            cacheId: 'wordle-v7',

            // Pre-cache essential offline assets
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

            // Navigation fallback for offline
            navigateFallback: '/offline.html',
            navigateFallbackAllowlist: [/^\/[a-z]{2,3}(\/|$)/],

            // Clean up old caches from previous versions
            cleanupOutdatedCaches: true,

            // Skip waiting and claim clients immediately (matches existing SW behavior)
            skipWaiting: true,
            clientsClaim: true,

            // Runtime caching strategies
            runtimeCaching: [
                {
                    // HTML pages and API routes: NetworkFirst
                    // Pages contain the daily word which changes, so always try network
                    urlPattern: ({ request, url }) =>
                        request.mode === 'navigate' ||
                        url.pathname.startsWith('/api/'),
                    handler: 'NetworkFirst',
                    options: {
                        cacheName: 'wordle-pages',
                        expiration: {
                            maxEntries: 50,
                            maxAgeSeconds: 24 * 60 * 60, // 1 day
                        },
                        networkTimeoutSeconds: 3,
                    },
                },
                {
                    // Static assets (JS, CSS, images, fonts): CacheFirst
                    // Nuxt hashes these filenames, so they are immutable
                    urlPattern: ({ url }) =>
                        url.pathname.startsWith('/_nuxt/') ||
                        url.pathname.startsWith('/favicon/') ||
                        url.pathname.startsWith('/images/'),
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'wordle-static',
                        expiration: {
                            maxEntries: 100,
                            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                        },
                        cacheableResponse: {
                            statuses: [0, 200],
                        },
                    },
                },
                {
                    // Word definition images and other dynamic assets: StaleWhileRevalidate
                    urlPattern: ({ url }) =>
                        url.pathname.startsWith('/word-images/') ||
                        url.pathname.startsWith('/definitions/'),
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'wordle-dynamic',
                        expiration: {
                            maxEntries: 200,
                            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                        },
                        cacheableResponse: {
                            statuses: [0, 200],
                        },
                    },
                },
            ],
        },

        // Client-side PWA options
        client: {
            // We handle install prompt manually in pwa.client.ts plugin
            installPrompt: false,
        },

        devOptions: {
            enabled: false, // Enable in dev if needed for testing
        },
    },
});
