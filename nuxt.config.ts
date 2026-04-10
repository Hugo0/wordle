import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    compatibilityDate: '2025-06-14',
    devtools: { enabled: true },

    modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@posthog/nuxt'],

    posthogConfig: {
        publicKey: 'phc_DMY07B83ghetzxgIbBhobbdSjlueym6vNVVZwM79SPp',
        clientConfig: {
            api_host: '/t', // Proxied through Nitro server route
            ui_host: 'https://eu.posthog.com',
            autocapture: false,
            capture_pageview: 'history_change', // Auto-track SPA navigations
            capture_pageleave: false, // Disabled to reduce event volume (was ~61K/8 days)
            enable_web_vitals: false, // Disabled to reduce event volume (was ~110K/8 days)
            session_recording: {
                sampleRate: 0.03,
            },
            persistence: 'localStorage+cookie',
        },
    },

    app: {
        // Page transitions are driven dynamically by app.vue via :transition
        // prop (direction-aware). This static config is the fallback for SSR.
        pageTransition: { name: 'page-lateral', mode: 'out-in' },
        // Layout transition disabled — the page transition already handles
        // the visual change; a layout transition on top causes double-fade.
        layoutTransition: false,
    },

    experimental: {
        // View Transitions API (Tier 3): compositor-level page transitions
        // with shared-element morphing (header stays in place). Nuxt's plugin
        // handles feature detection, reduced-motion, and popstate. Tier 1
        // CSS transitions are the fallback for unsupported browsers.
        viewTransition: true,
    },

    css: ['~/assets/css/main.css'],

    vite: {
        plugins: [tailwindcss()],
        server: {
            allowedHosts: true,
        },
        vue: {
            template: {
                compilerOptions: {
                    isCustomElement: (tag: string) => tag === 'pwa-install',
                },
            },
        },
    },

    // Resolve data directory: data/ relative to project root
    runtimeConfig: {
        dataDir: process.env.DATA_DIR || '',
        nuxtDataDir: '', // Set in nitro plugin at startup
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
                { rel: 'manifest', href: '/manifest.json' },
            ],
            meta: [
                // Default og:image fallback — pages override with useSeoMeta({ ogImage })
                { property: 'og:image', content: 'https://wordle.global/images/og-image.png' },
                { property: 'og:image:width', content: '1200' },
                { property: 'og:image:height', content: '630' },
            ],
        },
    },

    pwa: {
        registerType: 'autoUpdate',
        scope: '/',
        manifest: {
            id: '/',
            name: 'Wordle Global',
            short_name: 'Wordle',
            // NOTE: Language count "80+" is hardcoded in several static contexts.
            // When adding languages, update these locations:
            //   - nuxt.config.ts (here, PWA manifest)
            //   - public/manifest.json
            //   - pages/accessibility.vue (meta + body text)
            //   - pages/[lang]/*.vue noscript blocks (index, unlimited, dordle, tridle, quordle, speed)
            //   - pages/[lang]/index.vue PWA install description
            // The homepage (pages/index.vue) uses dynamic langCount from the API.
            description:
                'Daily word puzzle game in 80+ languages. Guess the 5-letter word in 6 tries — a new puzzle every day. Free, no account needed.',
            start_url: '/',
            display: 'standalone',
            background_color: '#faf8f5',
            theme_color: '#faf8f5',
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
                    src: '/favicon/maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                },
                {
                    src: '/favicon/apple-touch-icon.png',
                    sizes: '180x180',
                    type: 'image/png',
                    purpose: 'any',
                },
            ],
            screenshots: [
                {
                    src: '/images/og-image.png',
                    sizes: '1200x630',
                    type: 'image/png',
                    form_factor: 'wide',
                    label: "Wordle Global — The world's word game",
                },
                {
                    src: '/images/screenshot-mobile-light.png',
                    sizes: '1170x2532',
                    type: 'image/png',
                    form_factor: 'narrow',
                    label: 'Wordle Global — Light mode',
                },
                {
                    src: '/images/screenshot-mobile-dark.png',
                    sizes: '1170x2532',
                    type: 'image/png',
                    form_factor: 'narrow',
                    label: 'Wordle Global — Dark mode',
                },
                {
                    src: '/images/screenshot-mobile.png',
                    sizes: '1170x2532',
                    type: 'image/png',
                    form_factor: 'narrow',
                    label: 'Wordle Global — Game in progress',
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
                        request.mode === 'navigate' || url.pathname.startsWith('/api/'),
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
