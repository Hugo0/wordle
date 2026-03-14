<script setup lang="ts">
definePageMeta({ layout: 'default' });

const { data: stats } = await useFetch('/api/stats');

useSeoMeta({
    title: 'Wordle Global — Statistics',
    description: 'Site-wide statistics for Wordle Global across all languages.',
});
</script>

<template>
    <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold mb-4">Wordle Global Statistics</h1>

        <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
                <div class="text-2xl font-bold">{{ stats.total_languages }}</div>
                <div class="text-sm text-neutral-500">Languages</div>
            </div>
            <div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
                <div class="text-2xl font-bold">
                    {{ stats.total_words?.toLocaleString() }}
                </div>
                <div class="text-sm text-neutral-500">Total Words</div>
            </div>
            <div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
                <div class="text-2xl font-bold">
                    {{ stats.global_plays?.toLocaleString() }}
                </div>
                <div class="text-sm text-neutral-500">Total Plays</div>
            </div>
            <div class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center">
                <div class="text-2xl font-bold">{{ stats.global_win_rate }}%</div>
                <div class="text-sm text-neutral-500">Win Rate</div>
            </div>
        </div>

        <NuxtLink to="/" class="text-green-600 hover:underline text-sm mt-4 inline-block">
            ← Back to languages
        </NuxtLink>
    </div>
</template>
