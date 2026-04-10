<script setup lang="ts">
/**
 * Word Archive — /<lang>/words
 *
 * Paginated list of all past daily words with mini tiles, definitions,
 * stats summaries, and links to word detail pages. Matches legacy
 * words_hub.html template.
 */

import { formatDateLong, RTL_LANGS } from '~/utils/locale';
import { readJson } from '~/utils/storage';
import { interpolate } from '~/utils/interpolate';
import { translatePos } from '~/utils/i18n';
import { wordDetailPath, wordDetailPathOrIdx } from '~/utils/wordUrls';

// Force full remount when language changes — prevents today-revealed state
// and cached API data from bleeding between languages when Vue Router reuses
// the component on /<lang>/words → /<otherLang>/words.
definePageMeta({
    key: (route) => route.params.lang as string,
});

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

// UI labels from API response with English fallbacks
const ui = (wordsData.value.ui as Record<string, string>) || {};
const label = (key: string, fallback: string) => ui[key] || fallback;

// SEO templates from language_config.json meta.word_archive (merged with defaults)
const meta = (wordsData.value.meta as Record<string, any>) || {};
const wordArchiveMeta = meta.word_archive || {};

// Word art thumbnail visibility (reactive, per day index)
const wordArtLoaded = reactive(new Set<number>());

const title = computed(() =>
    interpolate(wordArchiveMeta.title || 'Wordle {langNative} — All Words | Word Archive', {
        langNative: langNameNative.value,
        count: todaysIdx.value,
    })
);
const description = computed(() =>
    interpolate(
        wordArchiveMeta.description ||
            'Browse all {count} past Wordle words in {langNative}. See definitions, AI art, and community stats for every daily word.',
        { langNative: langNameNative.value, count: todaysIdx.value }
    )
);

useSeoMeta({
    title,
    description: computed(() => description.value.slice(0, 200)),
    ogTitle: title,
    ogUrl: `https://wordle.global/${lang}/archive`,
    ogType: 'website',
    ogLocale: lang,
    ogDescription: computed(() => description.value.slice(0, 200)),
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: computed(() => description.value.slice(0, 200)),
});

useHead({
    htmlAttrs: { lang, dir: RTL_LANGS.has(lang) ? 'rtl' : 'ltr' },
    link: [
        {
            rel: 'canonical',
            href: computed(
                () =>
                    `https://wordle.global/${lang}/archive${page.value > 1 ? `?page=${page.value}` : ''}`
            ),
        },
        ...(page.value > 1
            ? [
                  {
                      rel: 'prev',
                      href: `https://wordle.global/${lang}/archive${page.value > 2 ? `?page=${page.value - 1}` : ''}`,
                  },
              ]
            : []),
        ...(page.value < totalPages.value
            ? [{ rel: 'next', href: `https://wordle.global/${lang}/archive?page=${page.value + 1}` }]
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
                    url: `https://wordle.global/${lang}/archive`,
                    isPartOf: {
                        '@type': 'WebSite',
                        name: 'Wordle Global',
                        url: 'https://wordle.global',
                    },
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: words.value.length,
                        itemListElement: words.value
                            .filter((w) => w.word)
                            .map((w, i) => ({
                                '@type': 'ListItem',
                                position: i + 1 + (page.value - 1) * 30,
                                url: `https://wordle.global${wordDetailPath(lang, w.word!)}`,
                                name: `${w.word!.toUpperCase()} \u2014 Wordle ${langNameNative.value} #${w.day_idx}`,
                            })),
                    },
                })
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
                            name: label('all_words', 'All Words'),
                            item: `https://wordle.global/${lang}/archive`,
                        },
                    ],
                })
            ),
        },
    ],
});

function formatDate(dateStr: string): string {
    return formatDateLong(dateStr, lang);
}

function winRate(stats: { total: number; wins: number }): number {
    return Math.round((stats.wins / stats.total) * 100);
}

// Client-side: reveal today's word if game is over (won or lost)
const todayRevealed = ref<string | null>(null);
const completedDays = ref(new Set<number>());

onMounted(() => {
    // Check current game state — key is the language code
    const saved = readJson<{ game_over?: boolean; todays_word?: string }>(lang);
    if (saved?.game_over && saved.todays_word) {
        todayRevealed.value = saved.todays_word;
    }

    // Build set of completed day indices from game_results
    const parsed = readJson<Record<string, { won: boolean; attempts: number; date: string }[]>>(
        'game_results'
    );
    const langResults = parsed?.[lang];
    if (Array.isArray(langResults)) {
        for (const r of langResults) {
            if (r.date) {
                const d = new Date(r.date);
                const nDays = Math.floor(d.getTime() / 86400000);
                const idx = nDays - 18992 + 195;
                completedDays.value.add(idx);
            }
        }
    }
});
</script>

<template>
    <AppShell :lang="lang" :lang-name="langNameNative" :ui="ui">
    <div class="archive-page">
        <header class="archive-header">
            <div class="eyebrow">
                Wordle {{ langNameNative }} &middot; Archive
            </div>
            <h1 class="headline">{{ label('all_words', 'All Words') }}</h1>
            <p class="subtitle">
                <em>{{ todaysIdx.toLocaleString() }}</em>
                {{ label('daily_words_counting', 'daily words and counting') }}
            </p>
        </header>

        <!-- Mode filter tabs -->
        <div class="mode-tabs">
            <button class="mode-tab active">Classic</button>
            <button class="mode-tab disabled" disabled>Speed <span class="coming-soon">Soon</span></button>
            <button class="mode-tab disabled" disabled>Multi-Board <span class="coming-soon">Soon</span></button>
            <button class="mode-tab disabled" disabled>Semantic <span class="coming-soon">Soon</span></button>
        </div>

        <div class="word-grid">
            <template v-for="(w, wi) in words" :key="w.day_idx">
                <!-- Today's word, not yet played -->
                <NuxtLink
                    v-if="w.is_today && !todayRevealed"
                    :to="`/${lang}`"
                    class="card card-today-locked"
                    :style="{ animationDelay: `${wi * 30}ms` }"
                >
                    <div class="day-meta">
                        <span class="day-idx">#{{ w.day_idx }}</span>
                        <span class="day-date">{{ formatDate(w.date) }}</span>
                    </div>
                    <div class="word-display masked">
                        <span v-for="i in 5" :key="i" class="mask-dot">?</span>
                    </div>
                    <div class="card-note accent">
                        {{ label('todays_word_reveal', 'Play to reveal') }}
                    </div>
                </NuxtLink>

                <!-- Today's word, revealed -->
                <NuxtLink
                    v-else-if="w.is_today && todayRevealed"
                    :to="wordDetailPath(lang, todayRevealed)"
                    class="card card-today"
                    :style="{ animationDelay: `${wi * 30}ms` }"
                >
                    <div class="day-meta">
                        <span class="day-idx">#{{ w.day_idx }}</span>
                        <span class="day-date">{{ label('today', 'Today') }}</span>
                    </div>
                    <div class="word-display">{{ todayRevealed }}</div>
                    <div class="card-note accent">{{ formatDate(w.date) }}</div>
                </NuxtLink>

                <!-- Past word -->
                <NuxtLink
                    v-else
                    :to="wordDetailPathOrIdx(lang, w)"
                    class="card"
                    :class="{ 'card-played': completedDays.has(w.day_idx) }"
                    :style="{ animationDelay: `${wi * 30}ms` }"
                >
                    <div class="day-meta">
                        <span class="day-idx">#{{ w.day_idx }}</span>
                        <span v-if="completedDays.has(w.day_idx)" class="played-mark" title="Played">
                            ✓
                        </span>
                    </div>

                    <div class="word-display">{{ w.word }}</div>

                    <div
                        v-show="w.word && wordArtLoaded.has(w.day_idx)"
                        class="art-frame"
                    >
                        <img
                            :src="`/api/${lang}/word-image/${w.word}?day_idx=${w.day_idx}`"
                            :alt="w.word || ''"
                            class="art"
                            loading="lazy"
                            @load="wordArtLoaded.add(w.day_idx)"
                        />
                    </div>

                    <div v-if="w.definition && w.definition.definition" class="definition-snippet">
                        <span
                            v-if="w.definition.part_of_speech"
                            class="pos"
                        >
                            {{ translatePos(w.definition.part_of_speech, ui) }}
                        </span>
                        <span class="def-body">
                            {{
                                w.definition.definition.length > 100
                                    ? w.definition.definition.slice(0, 100) + '\u2026'
                                    : w.definition.definition
                            }}
                        </span>
                    </div>

                    <div class="card-footer">
                        <span class="day-date">{{ formatDate(w.date) }}</span>
                        <span v-if="w.stats && w.stats.total > 0" class="stats">
                            {{ w.stats.total }} {{ label('plays', 'plays') }}
                            &middot;
                            {{ winRate(w.stats) }}% {{ label('win', 'win') }}
                        </span>
                    </div>
                </NuxtLink>
            </template>
        </div>

        <nav v-if="totalPages > 1" class="pagination">
            <NuxtLink
                v-if="page > 1"
                :to="`/${lang}/archive${page > 2 ? `?page=${page - 1}` : ''}`"
                class="text-btn"
            >
                &larr; Newer
            </NuxtLink>
            <span class="mono-label tabular-nums">
                {{ label('page', 'Page') }} {{ page }} / {{ totalPages }}
            </span>
            <NuxtLink
                v-if="page < totalPages"
                :to="`/${lang}/archive?page=${page + 1}`"
                class="text-btn"
            >
                Older &rarr;
            </NuxtLink>
        </nav>

        <div class="cta-wrap">
            <NuxtLink :to="`/${lang}`" class="text-btn accent">
                {{ label('play_todays_wordle', "Play Today's Wordle") }}
            </NuxtLink>
        </div>

        <footer class="archive-footer">
            <NuxtLink to="/stats">Global Stats</NuxtLink>
            &middot;
            <a
                href="https://github.com/Hugo0/wordle"
                target="_blank"
                rel="noopener noreferrer"
            >
                Open source on GitHub
            </a>
        </footer>
    </div>
    </AppShell>
</template>

<style scoped>
.mode-tabs {
    display: flex;
    border-bottom: 2px solid var(--color-rule);
    margin-bottom: 24px;
    gap: 0;
}
.mode-tab {
    flex: none;
    padding: 10px 16px;
    text-align: center;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.15s;
    background: none;
}
.mode-tab.active {
    color: var(--color-ink);
    border-bottom-color: var(--color-ink);
}
.mode-tab.disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
.coming-soon {
    font-size: 7px;
    letter-spacing: 0.06em;
    background: var(--color-paper-warm);
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 4px;
    vertical-align: middle;
}
.archive-page {
    min-height: 100vh;
    background: var(--color-paper);
    color: var(--color-ink);
    padding: 24px 20px 80px;
    max-width: 1280px;
    margin: 0 auto;
}
/* ── Header ─────────────────────────────────────────────────────────── */
.archive-header {
    text-align: center;
    padding: 8px 0 40px;
    max-width: 720px;
    margin: 0 auto;
}
.eyebrow {
    margin-bottom: 14px;
}
.headline {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(48px, 9vw, 84px);
    color: var(--color-ink);
    margin: 0;
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: lowercase;
}
.subtitle {
    font-family: var(--font-display);
    font-size: 16px;
    color: var(--color-muted);
    margin: 14px 0 0;
    line-height: 1.3;
}
.subtitle em {
    font-style: italic;
    color: var(--color-ink);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}

/* ── Word grid ──────────────────────────────────────────────────────── */
.word-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
    margin-bottom: 48px;
}

.card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px 20px 16px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    text-decoration: none;
    color: inherit;
    transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
    position: relative;
    animation: card-in 400ms ease both;
}
.card:hover {
    border-color: var(--color-ink);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
@keyframes card-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}
.card-today {
    border-color: var(--color-accent);
}
.card-today-locked {
    border-color: var(--color-rule);
    border-style: dashed;
}
.card-played::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-top: 12px solid var(--color-accent);
    border-left: 12px solid transparent;
}

.day-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
}
.day-idx {
    font-variant-numeric: tabular-nums;
}
.played-mark {
    color: var(--color-accent);
    font-size: 12px;
    letter-spacing: normal;
}

.word-display {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 32px;
    color: var(--color-ink);
    line-height: 1;
    text-transform: lowercase;
    letter-spacing: -0.01em;
    padding: 4px 0;
    text-align: left;
}
.word-display.masked {
    display: flex;
    gap: 8px;
}
.mask-dot {
    color: var(--color-muted);
    opacity: 0.4;
}

.art-frame {
    border: 1px solid var(--color-rule);
    background: var(--color-paper-warm);
    overflow: hidden;
    aspect-ratio: 3 / 2;
}
.art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.definition-snippet {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--color-ink);
    line-height: 1.4;
    opacity: 0.9;
}
.definition-snippet .pos {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-muted);
    margin-right: 6px;
}
.definition-snippet .def-body {
    color: var(--color-ink);
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
    border-top: 1px solid var(--color-rule);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-muted);
}
.day-date,
.stats {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.card-note {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-top: auto;
    padding-top: 6px;
    border-top: 1px solid var(--color-rule);
}
.card-note.accent {
    color: var(--color-accent);
}

/* ── Pagination ─────────────────────────────────────────────────────── */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    margin: 40px 0 32px;
}

.cta-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
}

/* ── Footer ─────────────────────────────────────────────────────────── */
.archive-footer {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-top: 40px;
}
.archive-footer a {
    color: var(--color-muted);
    text-decoration: none;
    transition: color 120ms ease;
}
.archive-footer a:hover {
    color: var(--color-accent);
}

/* ── Mobile ─────────────────────────────────────────────────────────── */
@media (max-width: 520px) {
    .archive-page {
        padding: 16px 12px 60px;
    }
    .word-grid {
        grid-template-columns: 1fr;
        gap: 14px;
    }
    .archive-header {
        padding-bottom: 28px;
    }
    .pagination {
        gap: 12px;
    }
}
</style>
