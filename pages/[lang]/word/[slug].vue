<script setup lang="ts">
/**
 * Word page — /<lang>/word/<slug>
 *
 * Unified word detail + Explorer for any word. Slug is numeric (legacy,
 * redirected to word-name) or a canonical word name. The page is a single
 * editorial flow: headline → definition (if any) → image (if cached) →
 * Nearby in Meaning → daily stats (for daily words only) → share → Giscus.
 *
 * The "Nearby in Meaning" section is the core interaction: it shows the
 * primary word plus its context (auto-selected neighbors or user-chosen
 * via `?context=a,b,c`), with lens chips that reshape the map by axis.
 */

import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import { formatDateLong, getLocaleForIntl, RTL_LANGS } from '~/utils/locale';
import { interpolate } from '~/utils/interpolate';
import { wordDetailPath, wordDetailUrl, wordImageUrl } from '~/utils/wordUrls';
import WordHeadline from '~/components/word/WordHeadline.vue';
import WordImage from '~/components/word/WordImage.vue';
import WordDefinition from '~/components/word/WordDefinition.vue';
import NearbyInMeaning from '~/components/word/NearbyInMeaning.vue';
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

useSeoMeta({
    title: titleStr,
    description: () => descriptionStr.value.slice(0, 200),
    ogTitle: titleStr,
    ogUrl: canonicalUrl,
    ogType: 'article',
    ogLocale: lang,
    ogDescription: () => descriptionStr.value.slice(0, 200),
    ogImage: () => (word.value ? wordImageUrl(lang, word.value, dayIdx.value) : undefined),
    twitterCard: 'summary_large_image',
    twitterTitle: titleStr,
    twitterDescription: () => descriptionStr.value.slice(0, 200),
    twitterImage: () => (word.value ? wordImageUrl(lang, word.value) : undefined),
    robots: () => (context.isCustom.value ? 'noindex,follow' : 'index,follow'),
});

useHead({
    htmlAttrs: { lang, dir: RTL_LANGS.has(lang) ? 'rtl' : 'ltr' },
    link: [{ rel: 'canonical', href: canonicalUrl }],
});

useHead({
    script: [
        {
            type: 'application/ld+json',
            innerHTML: computed(() => {
                if (!word.value) return '{}';
                const breadcrumb = {
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
                            name: word.value,
                            item: canonicalUrl.value,
                        },
                    ],
                };
                const wordDateStr = primary.value?.basic?.word_date || '';
                const definedTerm = defText.value
                    ? {
                          '@context': 'https://schema.org',
                          '@type': 'DefinedTerm',
                          name: word.value,
                          description: defText.value,
                          inDefinedTermSet: `https://wordle.global/${lang}/archive`,
                          url: canonicalUrl.value,
                          ...(wordDateStr && { dateModified: wordDateStr }),
                      }
                    : null;
                return JSON.stringify(definedTerm ? [breadcrumb, definedTerm] : breadcrumb);
            }) as unknown as string,
        },
    ],
});

// ── Image availability ──────────────────────────────────────────────────
// We only render the AI image section when there's a cached image. The
// image endpoint returns 404 when nothing has been pre-generated — we
// probe once on mount and hide the section entirely if so. This avoids
// the ugly typographic-fallback block that duplicates the headline.
const imageExists = ref(false);
async function probeImage() {
    if (!word.value) return;
    try {
        const resp = await fetch(wordImageUrl(lang, word.value, dayIdx.value), {
            method: 'HEAD',
        });
        imageExists.value = resp.ok;
    } catch {
        imageExists.value = false;
    }
}
watch(word, probeImage);
onMounted(probeImage);

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

// ── Giscus — stable-key mapping so URL changes don't orphan threads ─────
const GISCUS_LANGS = new Set([
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
]);
const giscusLang = GISCUS_LANGS.has(lang.slice(0, 2)) ? lang.slice(0, 2) : 'en';
const giscusContainer = ref<HTMLElement | null>(null);

let giscusListener: ((e: MessageEvent) => void) | null = null;
function removeGiscusListener() {
    if (giscusListener) {
        window.removeEventListener('message', giscusListener);
        giscusListener = null;
    }
}
function mountGiscus() {
    if (!giscusContainer.value || !word.value) return;
    removeGiscusListener();
    giscusContainer.value.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'Hugo0/wordle');
    script.setAttribute('data-repo-id', 'R_kgDOG5D4ng');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOG5D4ns4C3DFk');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `${lang}-word-${word.value}`);
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

    giscusListener = (event: MessageEvent) => {
        if (event.origin !== 'https://giscus.app') return;
        const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
        if (!iframe) return;
        const isDark = document.documentElement.classList.contains('dark');
        iframe.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: isDark ? 'dark' : 'light' } } },
            'https://giscus.app'
        );
    };
    window.addEventListener('message', giscusListener);
}
watch(word, (w) => {
    if (w) mountGiscus();
});
onUnmounted(() => {
    removeGiscusListener();
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

            <template v-else>
                <div class="eyebrow text-center mb-5">{{ eyebrowText }}</div>

                <div class="column">
                    <WordHeadline :word="word" :subtitle="subtitleText" size="lg" />

                    <!-- Definition: show content or skeleton during transition -->
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

                    <!-- Image: only when a pre-generated image exists -->
                    <div v-if="imageExists" class="image-wrap">
                        <WordImage :word="word" :lang="lang" :day-idx="dayIdx" :size="400" />
                    </div>

                    <!-- SSR neighbor links: visible before client-side explore data
                     loads. Provides internal link juice for crawlers and a
                     visible "related words" section during hydration. Replaced
                     by the interactive NearbyInMeaning graph once explore data
                     arrives. -->
                    <div
                        v-if="!primary.explore && basicData?.nearest_words?.length"
                        class="ssr-neighbors"
                    >
                        <div class="section-label">Related words</div>
                        <div class="neighbor-links">
                            <NuxtLink
                                v-for="w in basicData.nearest_words"
                                :key="w"
                                :to="`/${lang}/word/${w}`"
                                class="neighbor-link"
                            >
                                {{ w }}
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Full interactive meaning map (English with embeddings) -->
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

                    <!-- Embeddings not available (non-English languages) -->
                    <section
                        v-else-if="primary.explore && !primary.explore.available"
                        class="coming-soon-section"
                    >
                        <div class="section-label">Nearby in Meaning</div>
                        <p class="coming-soon-text">
                            Semantic maps are coming soon for {{ langNameNative }}.
                        </p>
                    </section>

                    <!-- Skeleton for the graph during transitions -->
                    <div
                        v-if="transitioning && !primary.explore"
                        class="skeleton-block map-skeleton"
                    >
                        <div class="skeleton-line w-1/3" />
                        <div class="skeleton-map-box" />
                    </div>

                    <!-- Appeared in: which daily modes featured this word -->
                    <section v-if="isDailyWord" class="stats-section">
                        <div class="section-label">Appeared In</div>
                        <div class="appeared-in">
                            <div class="appeared-mode">
                                <span class="appeared-mode-name">Classic Daily</span>
                                <span class="appeared-mode-detail"
                                    >#{{ dayIdx }} · {{ wordDate }}</span
                                >
                            </div>
                        </div>
                    </section>

                    <div class="share-wrap">
                        <button class="text-btn accent" @click="shareWord">
                            {{ shareBtnText }}
                        </button>
                        <NuxtLink :to="`/${lang}/archive`" class="text-btn"> ← archive </NuxtLink>
                    </div>
                </div>

                <section v-if="word" class="giscus-section">
                    <div class="section-label">Discussion</div>
                    <div ref="giscusContainer" class="giscus-mount" />
                </section>
            </template>
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
    gap: 36px;
}

.definition-block {
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
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
    display: flex;
    justify-content: center;
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
}
.appeared-mode-detail {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
}

.section-label {
    margin-bottom: 16px;
}

.share-wrap {
    display: flex;
    justify-content: center;
    gap: 16px;
}
.giscus-section {
    max-width: 720px;
    margin: 48px auto 0;
    padding-top: 32px;
    border-top: 1px solid var(--color-rule);
}
.giscus-mount {
    min-height: 100px;
}

/* ── SSR neighbor links (replaced by interactive graph on hydration) ── */
.ssr-neighbors {
    text-align: center;
}
.coming-soon-section {
    text-align: center;
    padding: 32px 0;
}
.coming-soon-text {
    font-family: var(--font-display);
    font-size: 15px;
    font-style: italic;
    color: var(--color-muted);
    margin: 0;
}
.neighbor-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
}
.neighbor-link {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    padding: 4px 12px;
    border: 1px solid var(--color-rule);
    text-decoration: none;
    transition:
        border-color 120ms ease,
        color 120ms ease;
}
.neighbor-link:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
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
        gap: 28px;
    }
}
</style>
