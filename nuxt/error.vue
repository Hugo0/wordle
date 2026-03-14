<script setup lang="ts">
const props = defineProps<{
    error: {
        statusCode: number;
        message: string;
    };
}>();

useSeoMeta({
    title: `${props.error.statusCode} — Wordle Global`,
});
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
        <div class="text-center">
            <h1 class="text-6xl font-bold text-neutral-300 dark:text-neutral-600 mb-4">
                {{ error.statusCode }}
            </h1>
            <p class="text-xl text-neutral-600 dark:text-neutral-400 mb-8">
                {{ error.message || 'Page not found' }}
            </p>
            <NuxtLink
                to="/"
                class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
                Go Home
            </NuxtLink>
        </div>
    </div>
</template>
