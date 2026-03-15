<script setup lang="ts">
/**
 * Word Archive — /<lang>/words
 *
 * Paginated list of all past daily words with mini tiles, definitions,
 * stats summaries, and links to word detail pages. Matches legacy
 * words_hub.html template.
 */

const route = useRoute();
const lang = route.params.lang as string;
const page = computed(() => parseInt((route.query.page as string) || '1', 10));

const { data: wordsData, error } = await useFetch(`/api/${lang}/words`, {
    query: { page },
});
if (error.value || !wordsData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const langName = computed(() => wordsData.value!.lang_name);
const langNameNative = computed(() => wordsData.value!.lang_name_native);
const todaysIdx = computed(() => wordsData.value!.todays_idx);
const totalPages = computed(() => wordsData.value!.total_pages);
const words = computed(() => wordsData.value!.words);

const title = computed(
    () => `Wordle ${langNameNative.value} \u2014 All Words | ${langName.value} Word Archive`,
);
const description = computed(
    () =>
        `Browse all ${todaysIdx.value} past Wordle words in ${langName.value} (${langNameNative.value}). See definitions, AI art, and community stats for every daily word.`,
);

useSeoMeta({
    title,
    description: computed(() => description.value.slice(0, 200)),
    ogTitle: title,
    ogUrl: `https://wordle.global/${lang}/words`,
    ogType: 'website',
    ogDescription: computed(() => description.value.slice(0, 200)),
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: computed(() => description.value.slice(0, 200)),
});

useHead({
    link: [
        {
            rel: 'canonical',
            href: computed(
                () =>
                    `https://wordle.global/${lang}/words${page.value > 1 ? `?page=${page.value}` : ''}`,
            ),
        },
        ...(page.value > 1
            ? [
                  {
                      rel: 'prev',
                      href: `https://wordle.global/${lang}/words${page.value > 2 ? `?page=${page.value - 1}` : ''}`,
                  },
              ]
            : []),
        ...(page.value < totalPages.value
            ? [{ rel: 'next', href: `https://wordle.global/${lang}/words?page=${page.value + 1}` }]
            : []),
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: computed(() =>
                JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: title.value,
                    description: description.value.slice(0, 200),
                    url: `https://wordle.global/${lang}/words`,
                    isPartOf: {
                        '@type': 'WebSite',
                        name: 'Wordle Global',
                        url: 'https://wordle.global',
                    },
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: words.value.length,
                        itemListElement: words.value.map((w, i) => ({
                            '@type': 'ListItem',
                            position: i + 1 + (page.value - 1) * 30,
                            url: `https://wordle.global/${lang}/word/${w.day_idx}`,
                            name: `${w.word.toUpperCase()} \u2014 Wordle ${langNameNative.value} #${w.day_idx}`,
                        })),
                    },
                }),
            ),
        },
        {
            type: 'application/ld+json',
            innerHTML: computed(() =>
                JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Wordle Global',
                            item: 'https://wordle.global/',
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            name: `Wordle ${langNameNative.value}`,
                            item: `https://wordle.global/${lang}`,
                        },
                        {
                            '@type': 'ListItem',
                            position: 3,
                            name: 'Word Archive',
                            item: `https://wordle.global/${lang}/words`,
                        },
                    ],
                }),
            ),
        },
    ],
});

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function winRate(stats: { total: number; wins: number }): number {
    return Math.round((stats.wins / stats.total) * 100);
}
</script>

<template>
    <div class="min-h-screen bg-white dark:bg-neutral-900 text-black dark:text-white transition-colors">
        <div class="max-w-4xl mx-auto px-4 py-6">
            <!-- Header -->
            <header class="text-center mb-6">
                <NuxtLink
                    :to="`/${lang}`"
                    class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    &larr; Play Wordle {{ langNameNative }}
                </NuxtLink>
                <h1 class="text-2xl font-bold mt-2">
                    Wordle {{ langNameNative }} &mdash; All Words
                </h1>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                    {{ todaysIdx.toLocaleString() }} daily words and counting
                </p>
            </header>

            <!-- Word Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <NuxtLink
                    v-for="w in words"
                    :key="w.day_idx"
                    :to="`/${lang}/word/${w.day_idx}`"
                    class="block bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 hover:shadow-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all group"
                >
                    <!-- Word tiles (mini) -->
                    <div class="flex justify-center gap-1 mb-2">
                        <div
                            v-for="(letter, li) in w.word"
                            :key="li"
                            class="w-8 h-8 flex items-center justify-center text-sm font-bold text-white bg-green-500 rounded uppercase"
                        >
                            {{ letter }}
                        </div>
                    </div>

                    <!-- Day and date -->
                    <p class="text-xs text-neutral-400 text-center">
                        #{{ w.day_idx }} &middot; {{ formatDate(w.date) }}
                    </p>

                    <!-- Definition snippet -->
                    <p
                        v-if="w.definition && w.definition.definition"
                        class="text-xs text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2 text-center"
                    >
                        {{
                            w.definition.definition.length > 80
                                ? w.definition.definition.slice(0, 80) + '\u2026'
                                : w.definition.definition
                        }}
                    </p>

                    <!-- Stats summary -->
                    <div
                        v-if="w.stats && w.stats.total > 0"
                        class="flex justify-center gap-3 mt-2 text-[10px] text-neutral-400"
                    >
                        <span>{{ w.stats.total }} plays</span>
                        <span>{{ winRate(w.stats) }}% win</span>
                    </div>

                    <!-- AI art thumbnail (loads async) -->
                    <div class="mt-2 overflow-hidden rounded hidden" :data-img-id="w.day_idx">
                        <img
                            :src="`/${lang}/api/word-image/${w.word}?day_idx=${w.day_idx}`"
                            :alt="w.word"
                            class="w-full h-24 object-cover"
                            loading="lazy"
                            @load="($event.target as HTMLImageElement).parentElement!.classList.remove('hidden')"
                            @error="($event.target as HTMLImageElement).parentElement!.classList.add('hidden')"
                        />
                    </div>
                </NuxtLink>
            </div>

            <!-- Pagination -->
            <nav v-if="totalPages > 1" class="flex justify-center items-center gap-4 mb-6">
                <NuxtLink
                    v-if="page > 1"
                    :to="`/${lang}/words${page > 2 ? `?page=${page - 1}` : ''}`"
                    class="py-2 px-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-500 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    &larr; Newer
                </NuxtLink>
                <span class="text-sm text-neutral-500 dark:text-neutral-400">
                    Page {{ page }} of {{ totalPages }}
                </span>
                <NuxtLink
                    v-if="page < totalPages"
                    :to="`/${lang}/words?page=${page + 1}`"
                    class="py-2 px-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-500 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    Older &rarr;
                </NuxtLink>
            </nav>

            <!-- CTA -->
            <div class="text-center mb-4">
                <NuxtLink
                    :to="`/${lang}`"
                    class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-green-500 hover:bg-green-600 transition-colors"
                >
                    Play Today's Wordle
                </NuxtLink>
            </div>

            <p class="text-center text-xs text-neutral-400">
                <NuxtLink to="/stats" class="hover:underline">Global Stats</NuxtLink>
                &middot;
                <a
                    href="https://github.com/Hugo0/wordle"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:underline"
                >
                    Open source on GitHub
                </a>
            </p>
        </div>
    </div>
</template>
