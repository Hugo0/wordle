<script setup lang="ts">
/**
 * Word Archive — /<lang>/words
 *
 * Paginated list of all past daily words with links to word detail pages.
 */

const route = useRoute();
const lang = route.params.lang as string;
const page = computed(() => parseInt((route.query.page as string) || '1', 10));

const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const config = gameData.value.config;
const todaysIdx = gameData.value.todays_idx;
const WORDS_PER_PAGE = 50;
const totalPages = computed(() => Math.ceil(todaysIdx / WORDS_PER_PAGE));

// Generate word indices for current page (newest first)
const wordIndices = computed(() => {
    const start = todaysIdx - (page.value - 1) * WORDS_PER_PAGE;
    const end = Math.max(start - WORDS_PER_PAGE, 0);
    const indices: number[] = [];
    for (let i = start; i > end; i--) {
        indices.push(i);
    }
    return indices;
});

const langName = config.name_native || config.name;
const title = `Wordle ${langName} — All Words`;
const description = `Browse all ${todaysIdx} past Wordle words in ${config.name}. See definitions and community stats for every daily word.`;

useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogUrl: `https://wordle.global/${lang}/words`,
});

useHead({
    link: [
        { rel: 'canonical', href: `https://wordle.global/${lang}/words${page.value > 1 ? `?page=${page.value}` : ''}` },
        ...(page.value > 1 ? [{ rel: 'prev', href: `https://wordle.global/${lang}/words${page.value > 2 ? `?page=${page.value - 1}` : ''}` }] : []),
        ...(page.value < totalPages.value ? [{ rel: 'next', href: `https://wordle.global/${lang}/words?page=${page.value + 1}` }] : []),
    ],
});
</script>

<template>
    <div class="min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white">
        <div class="max-w-2xl mx-auto px-4 py-8">
            <div class="mb-6">
                <NuxtLink :to="`/${lang}`" class="text-green-600 hover:underline text-sm">
                    ← Back to game
                </NuxtLink>
                <h1 class="text-2xl font-bold mt-2">{{ langName }} — Word Archive</h1>
                <p class="text-sm text-neutral-500">{{ todaysIdx }} words and counting</p>
            </div>

            <!-- Word list -->
            <div class="space-y-1">
                <NuxtLink
                    v-for="idx in wordIndices"
                    :key="idx"
                    :to="`/${lang}/word/${idx}`"
                    class="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <span class="font-mono text-sm text-neutral-500">#{{ idx }}</span>
                    <span class="text-sm text-green-600">View →</span>
                </NuxtLink>
            </div>

            <!-- Pagination -->
            <div class="flex justify-between items-center mt-8">
                <NuxtLink
                    v-if="page > 1"
                    :to="`/${lang}/words${page > 2 ? `?page=${page - 1}` : ''}`"
                    class="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg text-sm"
                >
                    ← Newer
                </NuxtLink>
                <span v-else />
                <span class="text-sm text-neutral-500">Page {{ page }} of {{ totalPages }}</span>
                <NuxtLink
                    v-if="page < totalPages"
                    :to="`/${lang}/words?page=${page + 1}`"
                    class="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg text-sm"
                >
                    Older →
                </NuxtLink>
                <span v-else />
            </div>
        </div>
    </div>
</template>
