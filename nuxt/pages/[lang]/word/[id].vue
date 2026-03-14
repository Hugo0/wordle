<script setup lang="ts">
/**
 * Word Detail — /<lang>/word/<id>
 *
 * Shows a past daily word with definition, AI image, community stats,
 * share button, navigation, and Giscus comments. Matches legacy word.html template.
 */

const route = useRoute();
const lang = route.params.lang as string;
const dayIdx = parseInt(route.params.id as string, 10);

const { data: wordData, error } = await useFetch(`/api/${lang}/word/${dayIdx}`);
if (error.value || !wordData.value) {
    throw createError({ statusCode: 404, message: 'Word not found' });
}

const d = wordData.value;
const langNameNative = d.lang_name_native;
const wiktLang = d.wikt_lang;
const todaysIdx = d.todays_idx;
const word = d.word;
const definition = d.definition;
const wordStats = d.word_stats;

// Format date
function formatDateLong(dateStr: string | null): string {
    if (!dateStr) return '';
    const dt = new Date(dateStr + 'T00:00:00Z');
    return dt.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

const wordDate = formatDateLong(d.word_date);

// SEO
const defText = definition?.definition || '';
const posText = definition?.part_of_speech ? definition.part_of_speech + ': ' : '';
const titleStr = word
    ? `Wordle ${langNameNative} #${dayIdx} \u2014 ${word.toUpperCase()}`
    : `Wordle ${langNameNative} #${dayIdx}`;
const descriptionStr = word
    ? defText
        ? `The Wordle word for ${d.lang_name} #${dayIdx} (${wordDate}) was ${word.toUpperCase()}. ${posText}${defText}`
        : `The Wordle word for ${d.lang_name} #${dayIdx} (${wordDate}) was ${word.toUpperCase()}. Can you guess it in 6 tries?`
    : `Wordle ${langNameNative} word #${dayIdx}. Coming soon.`;

useSeoMeta({
    title: titleStr,
    description: descriptionStr.slice(0, 200),
    ogTitle: titleStr,
    ogUrl: `https://wordle.global/${lang}/word/${dayIdx}`,
    ogType: 'article',
    ogDescription: descriptionStr.slice(0, 200),
    ogImage: word
        ? `https://wordle.global/api/${lang}/word-image/${word}?day_idx=${dayIdx}`
        : undefined,
    twitterCard: 'summary_large_image',
    twitterTitle: titleStr,
    twitterDescription: descriptionStr.slice(0, 200),
    twitterImage: word
        ? `https://wordle.global/api/${lang}/word-image/${word}?day_idx=${dayIdx}`
        : undefined,
});

useHead({
    link: [{ rel: 'canonical', href: `https://wordle.global/${lang}/word/${dayIdx}` }],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
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
                        name: `Wordle ${langNameNative}`,
                        item: `https://wordle.global/${lang}`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: `Word #${dayIdx}`,
                        item: `https://wordle.global/${lang}/word/${dayIdx}`,
                    },
                ],
            }),
        },
    ],
});

// Stats helpers
const avgAttempts = computed(() => {
    if (!wordStats?.distribution) return '\u2014';
    let totalAttempts = 0;
    let totalWins = 0;
    for (const [k, v] of Object.entries(wordStats.distribution)) {
        totalAttempts += parseInt(k, 10) * (v as number);
        totalWins += v as number;
    }
    return totalWins > 0 ? (totalAttempts / totalWins).toFixed(1) : '\u2014';
});

const maxDistCount = computed(() => {
    if (!wordStats?.distribution) return 1;
    return Math.max(...Object.values(wordStats.distribution).map(Number), 1);
});

function distWidth(n: number): string {
    if (!wordStats?.distribution) return '0%';
    const count = wordStats.distribution[String(n)] || 0;
    const max = maxDistCount.value;
    return max > 0 ? `${(count / max) * 100}%` : '0%';
}

function distCount(n: number): number {
    if (!wordStats?.distribution) return 0;
    return wordStats.distribution[String(n)] || 0;
}

// Share button
const shareBtnText = ref('Share');
const shareBtnClass = ref('bg-green-500 hover:bg-green-600');

function shareWord() {
    const text = `Wordle ${langNameNative} #${dayIdx} \u2014 ${word!.toUpperCase()}\nhttps://wordle.global/${lang}/word/${dayIdx}`;
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            shareBtnText.value = 'Copied!';
            shareBtnClass.value = 'bg-emerald-600';
            setTimeout(() => {
                shareBtnText.value = 'Share';
                shareBtnClass.value = 'bg-green-500 hover:bg-green-600';
            }, 2000);
        });
    }
}

// Async definition fetch (if not server-rendered)
const asyncDef = ref<any>(null);
const showAsyncDef = ref(false);

onMounted(async () => {
    if (!word || (definition && definition.definition)) return;
    try {
        const data = await $fetch(`/api/${lang}/definition/${word}`);
        if (data && (data as any).definition) {
            asyncDef.value = data;
            showAsyncDef.value = true;
        }
    } catch {
        // ignore
    }
});

// Giscus theme sync
const giscusLangs = [
    'ar', 'be', 'bg', 'ca', 'cs', 'da', 'de', 'en', 'eo', 'es', 'eu', 'fa', 'fr',
    'he', 'hu', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ro', 'ru', 'th', 'tr',
    'uk', 'uz', 'vi',
];
const giscusLang = giscusLangs.includes(lang.slice(0, 2)) ? lang.slice(0, 2) : 'en';

// Load Giscus on mount
const giscusContainer = ref<HTMLElement | null>(null);

onMounted(() => {
    if (!giscusContainer.value) return;
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'Hugo0/wordle');
    script.setAttribute('data-repo-id', 'R_kgDOG5D4ng');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOG5D4ns4C3DFk');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '1');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    script.setAttribute('data-lang', giscusLang);
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;
    giscusContainer.value.appendChild(script);

    // Sync theme on dark mode change
    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://giscus.app') return;
        const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
        if (!iframe) return;
        const isDark = document.documentElement.classList.contains('dark');
        iframe.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: isDark ? 'dark' : 'light' } } },
            'https://giscus.app',
        );
    });
});
</script>

<template>
    <div class="min-h-screen bg-white dark:bg-neutral-900 text-black dark:text-white transition-colors">
        <div class="max-w-lg mx-auto px-4 py-6">
            <!-- Header -->
            <header class="text-center mb-6">
                <NuxtLink
                    :to="`/${lang}`"
                    class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    &larr; Play Wordle {{ langNameNative }}
                </NuxtLink>
                <h1 class="text-2xl font-bold mt-2">
                    Wordle {{ langNameNative }} #{{ dayIdx }}
                </h1>
                <p v-if="wordDate" class="text-sm text-neutral-500 dark:text-neutral-400">
                    {{ wordDate }}
                </p>
            </header>

            <!-- Future word -->
            <template v-if="d.is_future">
                <div class="text-center py-8">
                    <p class="text-neutral-500 dark:text-neutral-400 mb-4">
                        This word hasn't been played yet. Come back later!
                    </p>
                    <NuxtLink
                        :to="`/${lang}`"
                        class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-green-500 hover:bg-green-600 transition-colors"
                    >
                        Play Today's Wordle
                    </NuxtLink>
                </div>
            </template>

            <!-- Today's word -->
            <template v-else-if="d.is_today">
                <div class="text-center py-8">
                    <p class="text-lg font-bold text-green-700 dark:text-green-400 mb-2">
                        Today's word!
                    </p>
                    <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        Play today's game to reveal this word.
                    </p>
                    <NuxtLink
                        :to="`/${lang}`"
                        class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-green-500 hover:bg-green-600 transition-colors"
                    >
                        Play now
                    </NuxtLink>
                </div>
            </template>

            <!-- Past word (main content) -->
            <template v-else-if="word">
                <!-- AI Word Art Image -->
                <div id="word-art" class="mb-4 hidden">
                    <img
                        :src="`/api/${lang}/word-image/${word}?day_idx=${dayIdx}`"
                        :alt="word"
                        class="w-full max-h-64 object-contain rounded-xl shadow-md mx-auto"
                        @load="($event.target as HTMLImageElement).parentElement!.classList.remove('hidden')"
                        @error="($event.target as HTMLImageElement).parentElement!.classList.add('hidden')"
                    />
                </div>

                <!-- Word Tiles -->
                <div class="flex justify-center gap-1.5 mb-4">
                    <div
                        v-for="(letter, li) in word"
                        :key="li"
                        class="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold text-white bg-green-500 rounded-md shadow-sm uppercase"
                    >
                        {{ letter }}
                    </div>
                </div>

                <!-- Definition (server-rendered) -->
                <div
                    v-if="definition && definition.definition"
                    class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4"
                >
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            Definition
                        </span>
                        <span
                            v-if="definition.part_of_speech"
                            class="text-xs text-neutral-400 dark:text-neutral-500 italic"
                        >
                            {{ definition.part_of_speech }}
                        </span>
                    </div>
                    <p class="text-sm text-neutral-800 dark:text-neutral-200">
                        <strong class="uppercase">{{ word }}</strong> &mdash;
                        {{ definition.definition_native || definition.definition }}
                    </p>
                    <a
                        :href="`https://${wiktLang}.wiktionary.org/wiki/${word}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Wiktionary &#8599;
                    </a>
                </div>

                <!-- Async definition (client-fetched) -->
                <div
                    v-else-if="showAsyncDef && asyncDef"
                    class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4"
                >
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            Definition
                        </span>
                        <span
                            v-if="asyncDef.part_of_speech"
                            class="text-xs text-neutral-400 dark:text-neutral-500 italic"
                        >
                            {{ asyncDef.part_of_speech }}
                        </span>
                    </div>
                    <p class="text-sm text-neutral-800 dark:text-neutral-200">
                        <strong class="uppercase">{{ word }}</strong> &mdash;
                        {{ asyncDef.definition_native || asyncDef.definition }}
                    </p>
                    <a
                        :href="`https://${wiktLang}.wiktionary.org/wiki/${word}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Wiktionary &#8599;
                    </a>
                </div>

                <!-- Definition fallback (just wiktionary link) -->
                <div v-else class="text-center mb-4">
                    <a
                        :href="`https://${wiktLang}.wiktionary.org/wiki/${word}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Look up on Wiktionary
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                    </a>
                </div>

                <!-- Word Stats -->
                <div
                    v-if="wordStats && wordStats.total > 0"
                    class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4"
                >
                    <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 text-center">
                        Community Stats
                    </h3>
                    <div class="grid grid-cols-3 gap-2 text-center mb-3">
                        <div>
                            <p class="text-lg font-bold">{{ wordStats.total }}</p>
                            <p class="text-[10px] text-neutral-500 dark:text-neutral-400">Players</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold">
                                {{ Math.round((wordStats.wins / wordStats.total) * 100) }}%
                            </p>
                            <p class="text-[10px] text-neutral-500 dark:text-neutral-400">Win Rate</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold">{{ avgAttempts }}</p>
                            <p class="text-[10px] text-neutral-500 dark:text-neutral-400">Avg Attempts</p>
                        </div>
                    </div>
                    <!-- Mini guess distribution -->
                    <div class="space-y-0.5">
                        <div v-for="n in 6" :key="n" class="flex items-center gap-1.5">
                            <span class="w-3 text-xs font-medium text-neutral-500">{{ n }}</span>
                            <div class="flex-1 h-3 bg-gray-100 dark:bg-neutral-700 rounded-sm overflow-hidden">
                                <div
                                    class="h-full bg-green-500 rounded-sm transition-all"
                                    :style="{ width: distWidth(n) }"
                                />
                            </div>
                            <span class="w-5 text-[10px] text-neutral-400 text-right">
                                {{ distCount(n) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Share Button -->
                <div class="mb-4">
                    <button
                        :class="[
                            'w-full py-2.5 px-4 text-white font-semibold rounded-lg shadow-md active:bg-green-700 transition-colors',
                            shareBtnClass,
                        ]"
                        @click="shareWord"
                    >
                        {{ shareBtnText }}
                    </button>
                </div>
            </template>

            <!-- Navigation -->
            <nav class="flex justify-between items-center text-sm">
                <NuxtLink
                    v-if="dayIdx > 1"
                    :to="`/${lang}/word/${dayIdx - 1}`"
                    class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    &larr; #{{ dayIdx - 1 }}
                </NuxtLink>
                <span v-else />

                <NuxtLink
                    :to="`/${lang}`"
                    class="py-1.5 px-4 text-sm font-medium text-green-600 dark:text-green-400 border border-green-500 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                    Play Today's Wordle
                </NuxtLink>

                <NuxtLink
                    v-if="dayIdx < todaysIdx"
                    :to="`/${lang}/word/${dayIdx + 1}`"
                    class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    #{{ dayIdx + 1 }} &rarr;
                </NuxtLink>
                <span v-else class="text-xs text-neutral-400">Latest</span>
            </nav>

            <p class="text-center mt-4">
                <NuxtLink
                    :to="`/${lang}/words`"
                    class="text-xs text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
                >
                    View all {{ langNameNative }} words
                </NuxtLink>
            </p>

            <!-- Discussion (Giscus) -->
            <div ref="giscusContainer" class="mt-6 mb-2" />

            <!-- Report bad word -->
            <p v-if="word" class="text-center mt-6 mb-2">
                <a
                    :href="`https://github.com/Hugo0/wordle/issues/new?template=bad-word.yml&title=Bad+word:+${word}+(${lang}+%23${dayIdx})`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
                >
                    Report bad word
                </a>
            </p>
        </div>
    </div>
</template>
