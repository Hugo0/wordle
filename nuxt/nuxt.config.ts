import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
    compatibilityDate: '2025-06-14',
    devtools: { enabled: true },

    modules: ['@pinia/nuxt'],

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
});
