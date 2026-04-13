<script setup lang="ts">
/**
 * Word page — /<lang>/word/<slug>
 *
 * Unified word detail + Explorer for any word. Slug is numeric (legacy,
 * redirected to word-name) or a canonical word name. The page is a single
 * editorial flow: headline → definition (if any) → image (if cached) →
 * Nearby in Meaning → daily stats (for daily words only) → share → comments.
 *
 * The "Nearby in Meaning" section is the core interaction: it shows the
 * primary word plus its context (auto-selected neighbors or user-chosen
 * via `?context=a,b,c`), with lens chips that reshape the map by axis.
 */

import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import { formatDateLong, getLocaleForIntl, RTL_LANGS } from '~/utils/locale';
import { interpolate } from '~/utils/interpolate';
import { wordDetailPath, wordDetailUrl } from '~/utils/wordUrls';
import { GAME_MODES_UI } from '~/composables/useGameModes';
import { Share2, Archive } from 'lucide-vue-next';
import WordHeadline from '~/components/word/WordHeadline.vue';
import WordDefinition from '~/components/word/WordDefinition.vue';
import WordDictionary from '~/components/word/WordDictionary.vue';
import type { DictionaryData } from '~/components/word/WordDictionary.vue';
import WordTranslations from '~/components/word/WordTranslations.vue';
import NearbyInMeaning from '~/components/word/NearbyInMeaning.vue';
import WordComments from '~/components/word/WordComments.vue';
import type { WordBasic, WordData, WordExploreData } from '~/composables/useWordData';
import type { WordDefinition as WordDefinitionType } from '~/utils/types';

// Intentionally NO `key` — we want the page to stay mounted across slug
// navigation so the map animates from one word's neighborhood to the
// next (via CSS transforms on the dots) instead of hard-remounting and
// losing spatial context. Remounting still happens on language change.
definePageMeta({
    key: (route) => `${route.params.lang}-word`,
});

const route = useRoute();
const router = useRouter();
const lang = route.params.lang as string;
const slug = computed(() => (route.params.slug as string)?.toLowerCase() || '');

const { fetchAll, prefetchExplore, prefetchBasic } = useWordData();

// Transition state — true between slug change and data arrival, used by
// template sections to show skeleton placeholders.
const transitioning = ref(false);

// Basic data via useFetch — SSR-eligible so initial HTML has title, meta,
// canonical, and JSON-LD populated. Explore enriches after hydration.
const { data: basicData, error: basicError } = await useFetch<WordBasic>(
    () => `/api/${lang}/word/${encodeURIComponent(slug.value)}`,
    { key: () => `word-basic-${lang}-${slug.value}` }
);
const notFound = computed(() => !!basicError.value || !basicData.value || !basicData.value.word);

// SSR: return 404 status for non-existent words so Google doesn't index them.
// Client-side: the template shows a "word not found" message instead.
if (import.meta.server && notFound.value && !basicData.value?.resolved_from_idx) {
    throw createError({ statusCode: 404, message: 'Word not found' });
}

// Legacy numeric slug → 301 redirect to canonical word-name URL.
// Server-side so Googlebot follows the redirect without needing JS.
const b = basicData.value;
if (b?.resolved_from_idx && b.word && String(b.day_idx) === slug.value) {
    const canonicalPath = wordDetailPath(lang, b.word);
    const queryStr = Object.keys(route.query).length
        ? '?' + new URLSearchParams(route.query as Record<string, string>).toString()
        : '';
    await navigateTo(canonicalPath + queryStr, { redirectCode: 301, replace: true });
}
// Client-side watch for SPA navigation to numeric slugs (e.g. archive links).
// The SSR redirect above handles the initial server render; this handles
// subsequent client-side navigations within the same page component.
watch(
    () => basicData.value?.resolved_from_idx,
    () => {
        const bd = basicData.value;
        if (bd?.resolved_from_idx && bd.word && String(bd.day_idx) === slug.value) {
            router.replace(wordDetailPath(lang, bd.word) + (window.location.search || ''));
        }
    }
);

// Explore (axes + neighbors + umap) + richer definition
const extraData = ref<{
    explore: WordExploreData | null;
    definition: WordDefinitionType | null;
} | null>(null);

// Generation counter: increments on each slug change so stale loadExtras
// calls (from a previous slug) can bail out before writing state.
let loadGeneration = 0;
// Timers for staggered prefetch — cleared on slug change to avoid piling
// up requests from a previous word's neighbor list.
let prefetchTimers: ReturnType<typeof setTimeout>[] = [];

/** True if the browser reports a slow or metered connection. Skips
 *  background prefetch to save bandwidth and server load. */
function shouldSkipPrefetch(): boolean {
    if (typeof navigator === 'undefined') return false;
    const conn = (navigator as any).connection;
    if (!conn) return false;
    if (conn.saveData) return true;
    const type = conn.effectiveType;
    return type === '2g' || type === 'slow-2g';
}

async function loadExtras() {
    if (!basicData.value?.word) return;

    // Cancel stale prefetch timers from the previous word
    prefetchTimers.forEach(clearTimeout);
    prefetchTimers = [];

    const gen = ++loadGeneration;
    transitioning.value = true;
    const full = await fetchAll(lang, basicData.value.word);

    // Bail if the user navigated to a different word while we were loading
    if (gen !== loadGeneration) return;

    extraData.value = { explore: full.explore, definition: full.definition };
    transitioning.value = false;

    // Background prefetch: concurrency-limited explore calls for neighbors.
    // Skipped on slow/metered connections to save bandwidth.
    if (shouldSkipPrefetch()) return;
    const neighborWords =
        full.explore?.nearest?.map((n) => n.word) ?? basicData.value?.nearest_words ?? [];

    // Stagger at 200ms intervals with max 3 concurrent (implicitly: the
    // browser's HTTP/2 connection limit handles actual concurrency; we just
    // avoid firing all 12 at once to spread the server-side compute).
    const STAGGER_MS = 200;
    neighborWords.forEach((w, i) => {
        const t = setTimeout(() => {
            if (loadGeneration !== gen) return; // slug changed, abort
            prefetchExplore(lang, w);
        }, i * STAGGER_MS);
        prefetchTimers.push(t);
    });
}

onMounted(loadExtras);
watch(() => basicData.value?.word, loadExtras);

// Primary view model — basic (SSR) merged with explore + definition (client)
const primary = computed<WordData | null>(() => {
    const basic = basicData.value;
    if (!basic) return null;
    const inlineDef = basic.definition;
    const fallbackDef: WordDefinitionType | null =
        inlineDef && basic.word
            ? {
                  word: basic.word,
                  definition: inlineDef.definition_native || inlineDef.definition,
                  partOfSpeech: inlineDef.part_of_speech,
                  source: 'llm',
                  url: '',
              }
            : null;
    return {
        basic,
        explore: extraData.value?.explore ?? null,
        definition: extraData.value?.definition ?? fallbackDef,
    };
});

// ── Context words (URL-driven via useContextWords) ──────────────────────
const primaryWord = computed(() => primary.value?.basic?.word || '');
const context = useContextWords(() => primaryWord.value);

/** Auto-populated context size — chosen to give the map visual weight
 *  out of the box while leaving headroom for user additions within the
 *  CONTEXT_MAX_TOTAL cap. */
const AUTO_CONTEXT_COUNT = 12;

/** Words shown as context in the map. When the user hasn't customized
 *  via `?context=`, we fall back to the top nearest semantic neighbors. */
const contextWords = computed<string[]>(() => {
    if (context.isCustom.value) return context.userWords.value;
    const neighbors = primary.value?.explore?.nearest ?? [];
    return neighbors.slice(0, AUTO_CONTEXT_COUNT).map((n) => n.word);
});

// Context data — only fetched for user-added custom words that aren't in the
// primary's neighbor list (which already includes projections for top 15).
// Auto-selected context words render instantly from explore.nearest.
const contextData = ref<Record<string, WordData>>({});
async function loadContextData() {
    if (!context.isCustom.value) {
        // Auto-mode: all context words come from explore.nearest — no extra fetches
        contextData.value = {};
        return;
    }
    const words = contextWords.value;
    const pw = primaryWord.value;
    if (!words.length || !pw) {
        contextData.value = {};
        return;
    }
    // Only fetch words not already in the explore neighbor list
    const neighborWords = new Set((primary.value?.explore?.nearest ?? []).map((n) => n.word));
    const next: Record<string, WordData> = { ...contextData.value };
    const missing = words.filter((w) => !next[w] && !neighborWords.has(w));
    await Promise.all(
        missing.map(async (w) => {
            const d = await fetchAll(lang, w, pw).catch(() => null);
            if (d?.basic?.word) next[w] = d;
        })
    );
    for (const k of Object.keys(next)) {
        if (!words.includes(k)) delete next[k];
    }
    contextData.value = next;
}

watch(
    [contextWords, primaryWord],
    ([words, pw]) => {
        if (pw && words.length) loadContextData();
        else contextData.value = {};
    },
    { immediate: true }
);

/** When the user adds a word from the auto-populated state, seed the URL
 *  with the current auto neighbors first so we don't lose them — then
 *  append the new word. Without this, the first add would "reset" the
 *  map to just {primary + new word}. */
function onAddContextWord(w: string) {
    const normalized = w.trim().toLowerCase();
    if (!normalized) return;
    if (!context.isCustom.value) {
        context.setWords([...contextWords.value, normalized]);
    } else {
        context.addWord(normalized);
    }
}

/** When removing from auto-populated context, promote to explicit URL
 *  first (minus the removed word) so the removal actually persists. */
function onRemoveContextWord(w: string) {
    if (!context.isCustom.value) {
        context.setWords(contextWords.value.filter((x) => x !== w));
    } else {
        context.removeWord(w);
    }
}

// ── SEO ─────────────────────────────────────────────────────────────────
const ui = computed(() => primary.value?.basic?.ui ?? {});
const label = (key: string, fallback: string) => ui.value[key] || fallback;
const langNameNative = computed(() => primary.value?.basic?.lang_name_native || lang);
const dayIdx = computed(() => primary.value?.basic?.day_idx ?? null);
const isDailyWord = computed(() => dayIdx.value != null);
const word = computed(() => primary.value?.basic?.word || '');
const wordDate = computed(() =>
    primary.value?.basic?.word_date ? formatDateLong(primary.value.basic.word_date, lang) : ''
);
const upperWord = computed(() =>
    word.value ? word.value.toLocaleUpperCase(getLocaleForIntl(lang)) : ''
);
const defText = computed(
    () => primary.value?.definition?.definitionNative || primary.value?.definition?.definition || ''
);
const posText = computed(() => primary.value?.definition?.partOfSpeech || '');
const ogImageStr = computed(() => {
    const imgUrl = basicData.value?.image_url;
    if (imgUrl) return `https://wordle.global${imgUrl}`;
    return `https://wordle.global/images/modes/classic/${lang}.png`;
});
const metaTemplates = computed(
    () =>
        ((primary.value?.basic?.meta as Record<string, unknown>)?.word_detail as Record<
            string,
            string
        >) || {}
);
const canonicalPath = computed(() => (word.value ? wordDetailPath(lang, word.value) : `/${lang}`));
const canonicalUrl = computed(() =>
    word.value ? wordDetailUrl(lang, word.value) : `https://wordle.global/${lang}`
);

// Title + description split for daily vs non-daily words so non-dailies
// don't get "Wordle #  — is coming soon! — DOG" garbage.
const titleStr = computed(() => {
    if (!word.value) return `Wordle ${langNameNative.value}`;
    if (isDailyWord.value) {
        return interpolate(
            metaTemplates.value.title || 'Wordle #{idx} — {date} — {word} | {langNative} Answer',
            {
                idx: dayIdx.value ?? '',
                date: wordDate.value || label('coming_soon', 'Coming soon'),
                word: upperWord.value,
                langNative: langNameNative.value,
            }
        );
    }
    return `${upperWord.value} — ${langNameNative.value} Wordle Dictionary`;
});

const descriptionStr = computed(() => {
    if (!word.value) return `Wordle ${langNameNative.value}`;
    if (isDailyWord.value && defText.value) {
        return interpolate(
            metaTemplates.value.description_with_def ||
                'The Wordle {langNative} answer for {date} (#{idx}) was {word}. {partOfSpeech}{definition}',
            {
                idx: dayIdx.value ?? '',
                date: wordDate.value || '',
                word: upperWord.value,
                langNative: langNameNative.value,
                partOfSpeech: posText.value ? `(${posText.value}) ` : '',
                definition: defText.value,
            }
        );
    }
    if (defText.value) {
        return `${upperWord.value}: ${defText.value} Explore its semantic neighborhood in Wordle ${langNameNative.value}.`;
    }
    return `Explore ${upperWord.value} — its meaning, semantic neighbors, and context in Wordle ${langNameNative.value}.`;
});

// Single useHead call — merging SEO meta, HTML attrs, link, and JSON-LD
// into one registration avoids the @unhead/vue dispose bug where separate
// useHead closures can have undefined `entry` on unmount.
useHead({
    title: titleStr,
    htmlAttrs: { lang, dir: RTL_LANGS.has(lang) ? 'rtl' : 'ltr' },
    meta: [
        { name: 'description', content: () => descriptionStr.value.slice(0, 200) },
        { property: 'og:title', content: titleStr },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:type', content: 'article' },
        { property: 'og:locale', content: lang },
        { property: 'og:description', content: () => descriptionStr.value.slice(0, 200) },
        { property: 'og:image', content: ogImageStr },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: titleStr },
        { name: 'twitter:description', content: () => descriptionStr.value.slice(0, 200) },
        { name: 'twitter:image', content: ogImageStr },
        { name: 'robots', content: () => (context.isCustom.value ? 'noindex,follow' : 'index,follow') },
    ],
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: computed(() => {
                try {
                    if (!word.value) return '{}';
                    const breadcrumb = {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Wordle Global', item: 'https://wordle.global/' },
                            { '@type': 'ListItem', position: 2, name: `Wordle ${langNameNative.value}`, item: `https://wordle.global/${lang}` },
                            { '@type': 'ListItem', position: 3, name: word.value, item: canonicalUrl.value },
                        ],
                    };
                    const wordDateStr = primary.value?.basic?.word_date || '';
                    const dict = dictionaryData.value;
                    const definedTerm = defText.value
                        ? {
                              '@context': 'https://schema.org',
                              '@type': 'DefinedTerm',
                              name: word.value,
                              description: defText.value,
                              inDefinedTermSet: `https://wordle.global/${lang}/archive`,
                              url: canonicalUrl.value,
                              ...(wordDateStr && { dateModified: wordDateStr }),
                              ...(dict?.pronunciation && { pronunciation: dict.pronunciation }),
                              ...(dict?.etymology && { termCode: posText.value || undefined }),
                          }
                        : null;
                    return JSON.stringify(definedTerm ? [breadcrumb, definedTerm] : breadcrumb);
                } catch { return '{}'; }
            }) as unknown as string,
        },
    ],
});

// ── Image ───────────────────────────────────────────────────────────────
const imageUrl = computed(() => basicData.value?.image_url || null);
const imageExpanded = ref(false);
watch(word, () => { imageExpanded.value = false; });

// ── Wiktionary link ─────────────────────────────────────────────────────
const wiktionaryUrl = computed(() => {
    if (!primary.value?.basic?.wiktionary_exists || !word.value) return null;
    const wiktLang = primary.value.basic.wikt_lang || 'en';
    return `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word.value)}`;
});

// ── Share ───────────────────────────────────────────────────────────────
const shareBtnText = ref('Share');
function shareWord() {
    if (!word.value) return;
    const text = `${upperWord.value} — ${langNameNative.value} Wordle${
        dayIdx.value ? ` #${dayIdx.value}` : ''
    }\n${canonicalUrl.value}`;
    if (navigator.share) {
        navigator.share({ text, url: canonicalUrl.value }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            shareBtnText.value = 'Copied';
            setTimeout(() => (shareBtnText.value = 'Share'), 2000);
        });
    }
}

// ── Comments key — scopes the comment thread to this language + word ────
const commentKey = computed(() => (word.value ? `${lang}-${word.value}` : ''));

onUnmounted(() => {
    prefetchTimers.forEach(clearTimeout);
    prefetchTimers = [];
});

// ── Eyebrow + daily stats ───────────────────────────────────────────────
const eyebrowText = computed(() => {
    if (!word.value) return '';
    if (isDailyWord.value) {
        return `WORDLE ${langNameNative.value.toUpperCase()}`;
    }
    return 'A WORD EXAMINED';
});

const subtitleText = computed(() => {
    if (posText.value && !isDailyWord.value) {
        return `${posText.value} — a portrait in meaning space`;
    }
    if (!isDailyWord.value) return 'a portrait in meaning space';
    return '';
});

// Mode labels and icons from the canonical game mode UI config
const modeLabels = Object.fromEntries(GAME_MODES_UI.map((m) => [m.id, m.label]));
const modeIcons = Object.fromEntries(GAME_MODES_UI.map((m) => [m.id, m.icon]));

const appearances = computed(() => basicData.value?.appearances ?? []);

const dictionaryData = computed<DictionaryData | null>(() => {
    const dict = basicData.value?.dictionary;
    if (!dict?.senses || !word.value) return null;
    return {
        word: word.value,
        entries: (dict.senses as DictionaryData['entries']) || [],
        etymology: dict.etymology || undefined,
        pronunciation: dict.pronunciation || undefined,
        forms: (dict.forms as DictionaryData['forms']) || undefined,
    };
});

const translations = computed(() => {
    return (basicData.value?.dictionary?.translations as Array<{ code: string; word: string; hasPage: boolean; name: string }>) || [];
});

</script>

<template>
    <AppShell :lang="lang" :lang-name="langNameNative" :ui="ui">
        <div class="word-page">
            <div v-if="notFound" class="not-found">
                <h1>Word not found</h1>
                <p>
                    The word <em>{{ slug }}</em> isn't in our dictionary.
                </p>
                <NuxtLink :to="`/${lang}/archive`" class="text-btn">Browse all words</NuxtLink>
            </div>

            <div v-else-if="!primary" class="loading">
                <em>Loading…</em>
            </div>

            <div v-else class="word-content">
                <div class="eyebrow text-center mb-5">{{ eyebrowText }}</div>

                <div class="column">
                    <WordHeadline :word="word" :subtitle="subtitleText" size="lg" />

                    <!-- Image (compact strip) + Definition — single editorial block -->
                    <div class="word-card">
                        <div
                            v-if="imageUrl"
                            class="image-wrap"
                            @click="imageExpanded = !imageExpanded"
                        >
                            <img
                                :src="imageUrl"
                                :alt="word"
                                class="word-img"
                                :class="{ expanded: imageExpanded }"
                                loading="lazy"
                            />
                            <button
                                class="image-expand-hint"
                                :class="{ flipped: imageExpanded }"
                                aria-label="Expand image"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <div
                            v-if="transitioning && !primary.definition?.definition"
                            class="definition-block skeleton-block"
                        >
                            <div class="skeleton-line w-3/4" />
                            <div class="skeleton-line w-1/2" />
                        </div>
                        <div v-else-if="primary.definition?.definition" class="definition-block">
                            <WordDefinition
                                :word="word"
                                :definition="primary.definition.definition"
                                :part-of-speech="primary.definition.partOfSpeech"
                                :ui="ui"
                            />
                            <a
                                v-if="wiktionaryUrl"
                                :href="wiktionaryUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="wiktionary-link"
                            >
                                Wiktionary →
                            </a>
                        </div>
                    </div>

                    <!-- Meaning map — the hero visual, right after the word card -->
                    <NearbyInMeaning
                        v-if="primary.explore?.available"
                        :lang="lang"
                        :primary="primary"
                        :context-data="contextData"
                        :context-words="contextWords"
                        :is-custom="context.isCustom.value"
                        :is-full="context.isFull.value"
                        @add="onAddContextWord"
                        @remove="onRemoveContextWord"
                        @reset-to-auto="context.resetToAuto"
                    />

                    <div
                        v-if="transitioning && !primary.explore"
                        class="skeleton-block map-skeleton"
                    >
                        <div class="skeleton-line w-1/3" />
                        <div class="skeleton-map-box" />
                    </div>

                    <!-- Appeared in: game modes where this word was a daily word -->
                    <section
                        v-if="appearances.length"
                        class="stats-section"
                    >
                        <div class="section-label">Appeared In</div>
                        <div class="appeared-in">
                            <div
                                v-for="app in appearances"
                                :key="`${app.mode}-${app.dayIdx}`"
                                class="appeared-mode"
                            >
                                <span class="appeared-mode-name">
                                    <component
                                        :is="modeIcons[app.mode]"
                                        v-if="modeIcons[app.mode]"
                                        :size="14"
                                        class="mode-icon"
                                    />
                                    {{ modeLabels[app.mode] || app.mode }}
                                    <span v-if="app.board != null" class="appeared-board">
                                        Board {{ app.board + 1 }}
                                    </span>
                                </span>
                                <span class="appeared-mode-detail">
                                    #{{ app.dayIdx }} · {{ formatDateLong(app.date, lang) }}
                                </span>
                            </div>
                        </div>
                    </section>

                    <div class="actions-row">
                        <button class="action-link" @click="shareWord">
                            <Share2 :size="13" />
                            <span>{{ shareBtnText }}</span>
                        </button>
                        <span class="action-sep">&middot;</span>
                        <NuxtLink :to="`/${lang}/archive`" class="action-link">
                            <Archive :size="13" />
                            <span>Archive</span>
                        </NuxtLink>
                    </div>
                </div>

                <!-- Comments -->
                <section v-if="word && commentKey" class="comments-section-wrap">
                    <WordComments
                        target-type="word"
                        :target-key="commentKey"
                        :lang="lang"
                        :appearances="appearances"
                    />
                </section>

                <!-- Reference sections (collapsed, SEO-rich) -->
                <div class="column reference-sections">
                    <WordDictionary
                        v-if="dictionaryData"
                        :data="dictionaryData"
                        :wiktionary-url="wiktionaryUrl"
                        collapsed
                    />

                    <WordTranslations
                        v-if="translations.length"
                        :translations="translations"
                        collapsed
                    />

                    <!-- Related words: always in DOM for SEO -->
                    <div
                        v-if="basicData?.nearest_words?.length"
                        class="related-words"
                        :class="{ 'sr-only-seo': primary?.explore?.available }"
                    >
                        <div class="related-words-label">Related Words</div>
                        <div class="related-words-grid">
                            <NuxtLink
                                v-for="w in basicData.nearest_words"
                                :key="w"
                                :to="`/${lang}/word/${w}`"
                                class="related-word-link"
                            >
                                {{ w }}
                            </NuxtLink>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AppShell>
</template>

<style scoped>
.word-page {
    min-height: 100vh;
    background: var(--color-paper);
    color: var(--color-ink);
    padding: 24px 20px 80px;
    max-width: 1280px;
    margin: 0 auto;
}
.loading,
.not-found {
    text-align: center;
    padding: 80px 20px;
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--color-muted);
}
.not-found h1 {
    font-weight: 700;
    font-size: 32px;
    color: var(--color-ink);
    margin: 0 0 12px;
}

.column {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.word-card {
    border-top: 2px solid var(--color-ink);
    border-bottom: 1px solid var(--color-rule);
    overflow: hidden;
}
.definition-block {
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.wiktionary-link {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    text-decoration: none;
    align-self: flex-start;
    transition: color 120ms ease;
}
.wiktionary-link:hover {
    color: var(--color-accent);
}

.image-wrap {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--color-rule);
    cursor: pointer;
}
.image-wrap:hover .image-expand-hint {
    opacity: 1;
}
.image-expand-hint {
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-ink);
    color: var(--color-paper);
    border: none;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 150ms ease, transform 200ms ease;
    pointer-events: none;
}
.image-expand-hint.flipped {
    transform: rotate(180deg);
}
.word-img {
    width: 100%;
    display: block;
    object-fit: cover;
    max-height: 120px;
    transition: max-height 300ms ease;
}
.word-img.expanded {
    max-height: 480px;
}

.stats-section {
    padding: 16px 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
}
.appeared-in {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}
.appeared-mode {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
}
.appeared-mode-name {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    display: flex;
    align-items: center;
    gap: 8px;
}
.mode-icon {
    color: var(--color-muted);
    flex-shrink: 0;
}
.appeared-mode-detail {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
}
.appeared-board {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-left: 6px;
}

.section-label {
    margin-bottom: 16px;
}

.actions-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}
.action-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 120ms ease;
}
.action-link:hover {
    color: var(--color-ink);
}
.action-sep {
    color: var(--color-rule);
    font-size: 14px;
}
.comments-section-wrap {
    max-width: 640px;
    margin: 32px auto 0;
    padding-top: 24px;
    border-top: 1px solid var(--color-rule);
}
.reference-sections {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px solid var(--color-ink);
}

/* ── Related words (always in DOM for SEO) ── */
.related-words {
    border: 1px solid var(--color-rule);
    padding: 16px 20px;
}
.related-words-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 12px;
}
.related-words-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.related-word-link {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    padding: 4px 12px;
    border: 1px solid var(--color-rule);
    text-decoration: none;
    transition: border-color 120ms ease, color 120ms ease;
}
.related-word-link:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
}
/* Visually hidden but in DOM for Google — used when the interactive
   meaning map already shows the same neighbors as interactive chips */
.sr-only-seo {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
/* ── Skeleton loading states ── */
.skeleton-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.skeleton-line {
    height: 14px;
    background: var(--color-rule);
    border-radius: 2px;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
}
.skeleton-map-box {
    height: 280px;
    background: var(--color-paper-warm, var(--color-rule));
    border-radius: 2px;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    animation-delay: 200ms;
}
@keyframes skeleton-pulse {
    0%,
    100% {
        opacity: 0.4;
    }
    50% {
        opacity: 0.8;
    }
}

@media (max-width: 720px) {
    .word-page {
        padding: 16px 12px 60px;
    }
    .column {
        gap: 20px;
    }
}
</style>
