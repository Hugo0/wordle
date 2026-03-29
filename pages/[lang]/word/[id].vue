<script setup lang="ts">
/**
 * Word Detail — /<lang>/word/<id>
 *
 * Shows a past daily word with definition, AI image, community stats,
 * share button, navigation, and Giscus comments. Matches legacy word.html template.
 */

interface DefinitionData {
    definition: string;
    definition_native?: string;
    part_of_speech?: string;
}

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

// UI labels from API response with English fallbacks
const ui = (d.ui as Record<string, string>) || {};
const label = (key: string, fallback: string) => ui[key] || fallback;

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
    ? `Wordle #${dayIdx} \u2014 ${wordDate} \u2014 ${word.toUpperCase()} | ${d.lang_name} Answer`
    : `Wordle ${langNameNative} #${dayIdx} \u2014 ${wordDate || 'Coming soon'}`;
const descriptionStr = word
    ? defText
        ? `The Wordle ${d.lang_name} answer for ${wordDate} (#${dayIdx}) was ${word.toUpperCase()}. ${posText}${defText}`
        : `The Wordle ${d.lang_name} answer for ${wordDate} (#${dayIdx}) was ${word.toUpperCase()}. Can you guess it in 6 tries?`
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
});

// Hreflang tags for all languages
const { data: allLangsWord } = await useFetch('/api/languages');
if (allLangsWord.value?.language_codes) {
    useHreflang(allLangsWord.value.language_codes, `/word/${dayIdx}`);
}

useHead({
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

function posLabel(pos: string | undefined | null): string {
    return translatePos(pos, ui);
}

// Share button
const shareBtnText = ref('Share');
const shareBtnClass = ref('bg-correct hover:opacity-90');

function shareWord() {
    if (!word) return;
    const text = `Wordle ${langNameNative} #${dayIdx} \u2014 ${word.toUpperCase()}\nhttps://wordle.global/${lang}/word/${dayIdx}`;
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            shareBtnText.value = 'Copied!';
            shareBtnClass.value = 'bg-correct opacity-90';
            setTimeout(() => {
                shareBtnText.value = 'Share';
                shareBtnClass.value = 'bg-correct hover:opacity-90';
            }, 2000);
        });
    }
}

// Word art image visibility (reactive, not DOM manipulation)
const wordArtLoaded = ref(false);

// Async definition fetch (if not server-rendered)
const asyncDef = ref<DefinitionData | null>(null);
const showAsyncDef = ref(false);

// Client-side: reveal today's word if game is over
const todayRevealed = ref<string | null>(null);
const todayRevealedDef = ref<DefinitionData | null>(null);

/**
 * Resolved definition — picks the best available source.
 * Used by a single template block instead of 3 duplicated ones.
 */
const resolvedDef = computed<DefinitionData | null>(() => {
    if (todayRevealedDef.value?.definition) return todayRevealedDef.value;
    if (definition?.definition) return definition as DefinitionData;
    if (showAsyncDef.value && asyncDef.value?.definition) return asyncDef.value;
    return null;
});

/** The word to display (today's revealed word or the past word). */
const displayWord = computed(() => todayRevealed.value || word);

onMounted(async () => {
    // Check if today's word should be revealed (game over in localStorage)
    if (d.is_today) {
        try {
            const saved = localStorage.getItem(lang);
            if (saved) {
                const state = JSON.parse(saved);
                if (state.game_over) {
                    // Use word from localStorage or from SSR data
                    const revealedWord = state.todays_word || word;
                    if (revealedWord) {
                        todayRevealed.value = revealedWord;
                        // Fetch definition for the revealed word
                        if (!definition?.definition) {
                            try {
                                const defData = await $fetch(
                                    `/api/${lang}/definition/${encodeURIComponent(revealedWord)}`
                                );
                                const def = defData as DefinitionData | null;
                                if (def?.definition) {
                                    todayRevealedDef.value = def;
                                }
                            } catch {
                                // definition not available
                            }
                        }
                    }
                }
            }
        } catch {
            // localStorage unavailable
        }
        return;
    }

    if (!word || (definition && definition.definition)) return;
    try {
        const data = (await $fetch(`/api/${lang}/definition/${word}`)) as DefinitionData | null;
        if (data?.definition) {
            asyncDef.value = data;
            showAsyncDef.value = true;
        }
    } catch {
        // ignore
    }
});

// Giscus theme sync
const giscusLangs = [
    'ar',
    'be',
    'bg',
    'ca',
    'cs',
    'da',
    'de',
    'en',
    'eo',
    'es',
    'eu',
    'fa',
    'fr',
    'he',
    'hu',
    'id',
    'it',
    'ja',
    'ko',
    'nl',
    'pl',
    'pt',
    'ro',
    'ru',
    'th',
    'tr',
    'uk',
    'uz',
    'vi',
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
    script.setAttribute(
        'data-theme',
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    script.setAttribute('data-lang', giscusLang);
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;
    giscusContainer.value.appendChild(script);

    // Sync theme on dark mode change
    const onGiscusMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://giscus.app') return;
        const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
        if (!iframe) return;
        const isDark = document.documentElement.classList.contains('dark');
        iframe.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: isDark ? 'dark' : 'light' } } },
            'https://giscus.app'
        );
    };
    window.addEventListener('message', onGiscusMessage);
    onUnmounted(() => window.removeEventListener('message', onGiscusMessage));
});
</script>

<template>
    <div class="min-h-screen bg-paper text-ink transition-colors">
        <div class="max-w-lg mx-auto px-4 py-6">
            <!-- Header -->
            <header class="text-center mb-6">
                <NuxtLink :to="`/${lang}`" class="text-sm text-accent hover:opacity-80">
                    &larr; Play Wordle {{ langNameNative }}
                </NuxtLink>
                <h1 class="heading-display text-2xl mt-2">
                    Wordle {{ langNameNative }} #{{ dayIdx }}
                </h1>
                <p v-if="wordDate" class="text-sm text-muted">
                    {{ wordDate }}
                </p>
            </header>

            <!-- Future word -->
            <template v-if="d.is_future">
                <div class="text-center py-8">
                    <p class="text-muted mb-4">
                        This word hasn't been played yet. Come back later!
                    </p>
                    <NuxtLink
                        :to="`/${lang}`"
                        class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-correct hover:opacity-90 transition-colors"
                    >
                        Play Today's Wordle
                    </NuxtLink>
                </div>
            </template>

            <!-- Today's word: not yet played -->
            <template v-else-if="d.is_today && !todayRevealed">
                <div class="text-center py-8">
                    <p class="text-sm text-muted mb-4">Play today's game to reveal this word.</p>
                    <NuxtLink
                        :to="`/${lang}`"
                        class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-correct hover:opacity-90 transition-colors"
                    >
                        Play Today's Wordle
                    </NuxtLink>
                </div>
            </template>

            <!-- Today's word revealed OR past word -->
            <template v-else-if="displayWord">
                <!-- AI Word Art Image (past words only, hidden until loaded) -->
                <div v-if="!d.is_today" v-show="wordArtLoaded" class="mb-4">
                    <img
                        :src="`/api/${lang}/word-image/${displayWord}?day_idx=${dayIdx}`"
                        :alt="displayWord"
                        class="w-full max-h-64 object-contain rounded-xl shadow-md mx-auto"
                        @load="wordArtLoaded = true"
                        @error="wordArtLoaded = false"
                    />
                </div>

                <!-- Word Tiles -->
                <div class="flex justify-center gap-1.5 mb-4">
                    <div
                        v-for="(letter, li) in displayWord"
                        :key="li"
                        class="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold text-white bg-correct rounded-md shadow-sm uppercase"
                    >
                        {{ letter }}
                    </div>
                </div>

                <!-- Definition (single unified block) -->
                <div v-if="resolvedDef" class="bg-paper-warm rounded-lg p-4 mb-4">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
                            {{ label('definition', 'Definition') }}
                        </span>
                        <span v-if="resolvedDef.part_of_speech" class="text-xs text-muted italic">
                            {{ posLabel(resolvedDef.part_of_speech) }}
                        </span>
                    </div>
                    <p class="text-sm text-ink">
                        <strong class="uppercase">{{ displayWord }}</strong> &mdash;
                        {{ resolvedDef.definition_native || resolvedDef.definition }}
                    </p>
                    <a
                        :href="`https://${wiktLang}.wiktionary.org/wiki/${displayWord}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:opacity-80"
                    >
                        Wiktionary &#8599;
                    </a>
                </div>

                <!-- Definition fallback (just wiktionary link) -->
                <div v-else class="text-center mb-4">
                    <a
                        :href="`https://${wiktLang}.wiktionary.org/wiki/${displayWord}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-sm text-accent hover:opacity-80"
                    >
                        Look up on Wiktionary
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                            />
                            <path
                                d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                            />
                        </svg>
                    </a>
                </div>

                <!-- Word Stats -->
                <div
                    v-if="wordStats && wordStats.total > 0"
                    class="bg-paper-warm rounded-lg p-4 mb-4"
                >
                    <h3
                        class="text-xs font-semibold uppercase tracking-wide text-muted mb-2 text-center"
                    >
                        {{ label('community_stats', 'Community Stats') }}
                    </h3>
                    <div class="grid grid-cols-3 gap-2 text-center mb-3">
                        <div>
                            <p class="text-lg font-bold">{{ wordStats.total }}</p>
                            <p class="text-[10px] text-muted">
                                {{ label('players', 'Players') }}
                            </p>
                        </div>
                        <div>
                            <p class="text-lg font-bold">
                                {{ Math.round((wordStats.wins / wordStats.total) * 100) }}%
                            </p>
                            <p class="text-[10px] text-muted">Win Rate</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold">{{ avgAttempts }}</p>
                            <p class="text-[10px] text-muted">Avg Attempts</p>
                        </div>
                    </div>
                    <!-- Mini guess distribution -->
                    <div class="space-y-0.5">
                        <div v-for="n in 6" :key="n" class="flex items-center gap-1.5">
                            <span class="w-3 text-xs font-medium text-muted">{{ n }}</span>
                            <div class="flex-1 h-3 bg-muted-soft rounded-sm overflow-hidden">
                                <div
                                    class="h-full bg-correct rounded-sm transition-all"
                                    :style="{ width: distWidth(n) }"
                                />
                            </div>
                            <span class="w-5 text-[10px] text-muted text-right">
                                {{ distCount(n) }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Share Button -->
                <div class="mb-4">
                    <button
                        :class="[
                            'w-full py-2.5 px-4 text-white font-semibold rounded-lg shadow-md active:opacity-80 transition-colors',
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
                    class="text-accent hover:opacity-80"
                >
                    &larr; #{{ dayIdx - 1 }}
                </NuxtLink>
                <span v-else />

                <NuxtLink
                    :to="`/${lang}`"
                    class="py-1.5 px-4 text-sm font-medium text-correct border border-correct rounded-lg hover:bg-correct-soft transition-colors"
                >
                    Play Today's Wordle
                </NuxtLink>

                <NuxtLink
                    v-if="dayIdx < todaysIdx"
                    :to="`/${lang}/word/${dayIdx + 1}`"
                    class="text-accent hover:opacity-80"
                >
                    #{{ dayIdx + 1 }} &rarr;
                </NuxtLink>
                <span v-else class="text-xs text-muted">Latest</span>
            </nav>

            <p class="text-center mt-4">
                <NuxtLink :to="`/${lang}/words`" class="text-xs text-muted hover:text-ink">
                    View all {{ langNameNative }} words
                </NuxtLink>
            </p>

            <!-- Discussion (Giscus) -->
            <div ref="giscusContainer" class="mt-6 mb-2" />

            <!-- Report bad word -->
            <p v-if="word" class="text-center mt-6 mb-2">
                <a
                    :href="`https://github.com/Hugo0/wordle/issues/new?template=bad-word.yml&title=Bad+word:+${word}+(${lang}+%23${dayIdx})&word=${encodeURIComponent(word)}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-muted hover:text-ink"
                >
                    {{ label('report_bad_word', 'Report bad word') }}
                </a>
            </p>
        </div>
    </div>
</template>
