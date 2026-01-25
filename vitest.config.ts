import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['frontend/src/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['frontend/src/**/*.ts'],
            exclude: ['frontend/src/**/*.{test,spec}.ts', 'frontend/src/types.ts'],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'frontend/src'),
        },
    },
});
