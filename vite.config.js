import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    root: 'frontend',
    resolve: {
        alias: {
            // Use the full Vue build with template compiler for in-DOM templates
            vue: 'vue/dist/vue.esm-bundler.js',
        },
    },
    build: {
        outDir: '../webapp/static/dist',
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'frontend/src/main.ts'),
            },
            output: {
                entryFileNames: '[name]-[hash].js',
                chunkFileNames: '[name]-[hash].js',
                assetFileNames: '[name]-[hash][extname]',
            },
        },
    },
    // Dev server proxies to Flask
    server: {
        proxy: {
            '/': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
});
