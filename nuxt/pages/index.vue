<script setup lang="ts">
/**
 * Homepage — /
 *
 * Language picker with search, showing all available languages.
 * Server-side rendered for SEO.
 */

const { data: langData } = await useFetch('/api/languages');

const langCount = computed(() => langData.value?.language_codes?.length || 65);

useSeoMeta({
    title: `Wordle Global — Play the Free Daily Word Game in ${langCount.value}+ Languages`,
    description: `Play Wordle today in ${langCount.value}+ languages — free, daily 5-letter word puzzle. Guess the word in 6 tries. No account needed.`,
    ogTitle: `Wordle Global — Daily Word Puzzle in ${langCount.value}+ Languages`,
    ogDescription: `Free daily word game in ${langCount.value}+ languages. Guess the hidden 5-letter word in 6 tries.`,
    ogUrl: 'https://wordle.global/',
    ogType: 'website',
    ogLocale: 'en',
    twitterCard: 'summary_large_image',
});

useHead({
    link: [
        { rel: 'canonical', href: 'https://wordle.global/' },
        { rel: 'sitemap', type: 'application/xml', title: 'Sitemap', href: '/sitemap.xml' },
    ],
    meta: [{ name: 'msvalidate.01', content: '609E2DD36EFFA9A3C673F46020FDF0D3' }],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'Wordle Global',
                url: 'https://wordle.global',
                applicationCategory: 'GameApplication',
                operatingSystem: 'Any',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                inLanguage: langData.value?.language_codes || [],
            }),
        },
    ],
});

// Client-side search
const searchQuery = ref('');
const sortedLanguages = computed(() => {
    if (!langData.value) return [];
    const langs = langData.value.language_popularity || langData.value.language_codes || [];
    const langMap = langData.value.languages || {};

    let filtered = langs.map((lc: string) => ({
        code: lc,
        name: langMap[lc]?.language_name || lc,
        nameNative: langMap[lc]?.language_name_native || lc,
    }));

    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(
            (l: any) =>
                l.name.toLowerCase().includes(q) ||
                l.nameNative.toLowerCase().includes(q) ||
                l.code.toLowerCase().includes(q),
        );
    }
    return filtered;
});

// Check which languages have been played
const playedLanguages = ref(new Set<string>());
onMounted(() => {
    try {
        const results = JSON.parse(localStorage.getItem('game_results') || '{}');
        playedLanguages.value = new Set(
            Object.keys(results).filter((k) => results[k]?.length > 0),
        );
    } catch {
        // ignore
    }
});
</script>

<template>
    <div class="min-h-[100dvh] bg-white dark:bg-neutral-900 text-black dark:text-white">
        <div class="container mx-auto max-w-2xl px-4 py-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold tracking-wider mb-2">
                    WORDLE
                    <span
                        class="text-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded px-2 py-0.5"
                    >
                        GLOBAL
                    </span>
                </h1>
                <p class="text-neutral-500 dark:text-neutral-400">
                    Daily word puzzle in {{ langCount }}+ languages
                </p>
            </div>

            <!-- Search -->
            <div class="mb-6">
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search languages..."
                    class="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            <!-- Language Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <NuxtLink
                    v-for="lang in sortedLanguages"
                    :key="lang.code"
                    :to="`/${lang.code}`"
                    class="flex flex-col p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-green-500 dark:hover:border-green-500 transition-colors"
                >
                    <span class="font-bold text-sm">{{ lang.nameNative }}</span>
                    <span class="text-xs text-neutral-500">{{ lang.name }}</span>
                    <span
                        v-if="playedLanguages.has(lang.code)"
                        class="text-xs text-green-500 mt-1"
                    >
                        Played
                    </span>
                </NuxtLink>
            </div>

            <!-- Footer -->
            <div class="text-center mt-12 text-sm text-neutral-400">
                <p>
                    <a
                        href="https://github.com/Hugo0/wordle"
                        class="hover:text-green-500 transition-colors"
                        target="_blank"
                    >
                        Open Source
                    </a>
                    · No ads · Free forever
                </p>
            </div>
        </div>
    </div>
</template>
