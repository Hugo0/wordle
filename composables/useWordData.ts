/**
 * useWordData — fetches everything the unified word page needs for a slug,
 * in parallel. Basic data is SSR-eligible; `explore` and the extra
 * definition call enrich the page after hydration. Results are memoized
 * by `lang:word` so navigation back and forth doesn't re-hit the network.
 *
 * Prefetch tiers for smooth word-to-word navigation:
 *   1. Background: prefetchExplore for all visible neighbors (cheap, ~5ms each)
 *   2. Hover: prefetchBasic with cacheOnly=1 (no LLM, disk cache only)
 *   3. Click: fetchAll reuses whatever's already cached from tiers 1+2
 */

import type { WordDefinition } from '~/utils/types';

export type WordAxisProjection = {
    axis: string;
    lowAnchor: string;
    highAnchor: string;
    /** Normalized position [0, 1] along the axis's p5..p95 range */
    normalized: number;
    /** Raw signed projection (word_vec · axis_vec) */
    rawProjection: number;
};

/** Inline definition returned by /api/[lang]/word/[slug] (snake_case to match
 *  the legacy response shape). The page also runs a separate definition
 *  fetch via `useDefinitions` for richer data; this inline value is used
 *  as an SSR-ready fallback. */
export type WordBasicDefinition = {
    definition: string;
    definition_native?: string;
    part_of_speech?: string;
};

export type WordBasic = {
    word: string;
    day_idx: number | null;
    todays_idx: number;
    word_date: string | null;
    is_past: boolean;
    is_today: boolean;
    is_future: boolean;
    /** True when the page was requested with a numeric slug — the client
     *  redirects to the canonical word-name URL so Google consolidates. */
    resolved_from_idx: boolean;
    lang_name_native: string;
    wikt_lang: string;
    wiktionary_exists: boolean;
    ui: Record<string, string>;
    meta: Record<string, unknown>;
    word_stats: unknown;
    definition: WordBasicDefinition | null;
    /** Top 8 nearest neighbor words for SSR link juice + prefetch seed */
    nearest_words?: string[];
};

export type NeighborEntry = {
    word: string;
    similarity: number;
    umap: [number, number] | null;
    /** Normalized axis projections — included for top ~15 foreground candidates
     *  so the map can render lens/slice views without per-word fetches. */
    projections?: Record<string, number>;
};

export type WordExploreData = {
    word: string;
    inVocab: boolean;
    projections: WordAxisProjection[];
    nearest: NeighborEntry[];
    umap: [number, number] | null;
    /** Cosine similarity to the page's primary word, when fetched with
     *  `?relativeTo=X`. Used by NearbyInMeaning to lay out user-added
     *  context words at a radius that reflects real semantic distance. */
    similarityTo: number | null;
    available: boolean;
};

export type WordData = {
    basic: WordBasic | null;
    explore: WordExploreData | null;
    definition: WordDefinition | null;
};

// ── Cache with LRU eviction ─────────────────────────────────────────────
const LRU_MAX = 50;

// Full data cache (basic + explore + definition)
const _cache = new Map<string, Promise<WordData>>();

// Partial caches for prefetched tiers so fetchAll can reuse them
const _exploreCache = new Map<string, Promise<WordExploreData | null>>();
const _basicCache = new Map<string, Promise<WordBasic | null>>();

function evictLRU<T>(map: Map<string, T>, max: number): void {
    if (map.size <= max) return;
    // Map iteration order is insertion order — delete oldest entries
    const excess = map.size - max;
    let i = 0;
    for (const key of map.keys()) {
        if (i >= excess) break;
        map.delete(key);
        i++;
    }
}

function cacheKey(lang: string, slug: string, relativeTo?: string | null): string {
    const base = `${lang}:${slug.toLowerCase()}`;
    return relativeTo ? `${base}@${relativeTo.toLowerCase()}` : base;
}

/** Promote the basic endpoint's inline definition into a WordDefinition
 *  shape. The basic endpoint already ran `fetchDefinition` server-side,
 *  so we don't need a second roundtrip. */
function basicDefinitionToWordDefinition(basic: WordBasic): WordDefinition | null {
    const d = basic.definition;
    if (!d || !d.definition) return null;
    return {
        word: basic.word,
        definition: d.definition_native || d.definition,
        partOfSpeech: d.part_of_speech,
        source: 'llm',
        url: '',
    };
}

export function useWordData() {
    /**
     * Tier 1: Prefetch just the explore data (neighbors, axes, UMAP).
     * This is the cheap call (~5ms server-side, pure in-memory math).
     * Called in the background for all visible neighbors after page load.
     * Fire-and-forget — errors are silently swallowed.
     */
    function prefetchExplore(lang: string, word: string): void {
        const key = cacheKey(lang, word);
        if (_exploreCache.has(key) || _cache.has(key)) return;

        const promise = $fetch<WordExploreData>(
            `/api/${lang}/word-explore/${encodeURIComponent(word)}`
        ).catch(() => null);

        _exploreCache.set(key, promise);
        evictLRU(_exploreCache, LRU_MAX);
    }

    /**
     * Tier 2: Prefetch the basic word data with cacheOnly=1.
     * Returns disk-cached definition (no LLM) + word info. Called on
     * dot hover as an intent signal. Fire-and-forget.
     */
    function prefetchBasic(lang: string, word: string): void {
        const key = cacheKey(lang, word);
        if (_basicCache.has(key) || _cache.has(key)) return;

        const promise = $fetch<WordBasic>(
            `/api/${lang}/word/${encodeURIComponent(word)}?cacheOnly=1`
        ).catch(() => null);

        _basicCache.set(key, promise);
        evictLRU(_basicCache, LRU_MAX);
    }

    /**
     * Fetch everything for one word. Reuses partial caches from prefetch
     * tiers when available. When `relativeTo` is passed, the explore
     * endpoint returns `similarityTo` relative to that other word.
     *
     * For word-name slugs (the normal case from dot clicks), basic and
     * explore fire in PARALLEL since we already know the word name —
     * no need to wait for basic to resolve it. Numeric day-index slugs
     * still go sequential (basic resolves the word name first).
     */
    async function fetchAll(
        lang: string,
        slug: string,
        relativeTo?: string | null
    ): Promise<WordData> {
        const key = cacheKey(lang, slug, relativeTo);
        const cached = _cache.get(key);
        if (cached) return cached;

        const isNumericSlug = /^\d+$/.test(slug);

        const promise = (async () => {
            const basicKey = cacheKey(lang, slug);

            // Resolve basic (reuse prefetch cache if available)
            const basicPromise = _basicCache.has(basicKey)
                ? _basicCache.get(basicKey)!
                : $fetch<WordBasic>(`/api/${lang}/word/${encodeURIComponent(slug)}`).catch(
                      () => null
                  );

            // For word-name slugs, fire explore in parallel (slug IS the word)
            const exploreKey = cacheKey(lang, slug, relativeTo);
            let explorePromise: Promise<WordExploreData | null> | null = null;
            if (!isNumericSlug) {
                if (!relativeTo && _exploreCache.has(exploreKey)) {
                    explorePromise = _exploreCache.get(exploreKey)!;
                } else {
                    const exploreUrl = relativeTo
                        ? `/api/${lang}/word-explore/${encodeURIComponent(slug)}?relativeTo=${encodeURIComponent(relativeTo)}`
                        : `/api/${lang}/word-explore/${encodeURIComponent(slug)}`;
                    explorePromise = $fetch<WordExploreData>(exploreUrl).catch(() => null);
                }
            }

            const basic = await basicPromise;
            if (!basic || !basic.word) {
                return { basic, explore: null, definition: null };
            }

            // For numeric slugs, basic resolved the word → now fetch explore
            let explore: WordExploreData | null;
            if (explorePromise) {
                explore = await explorePromise;
            } else {
                const resolvedKey = cacheKey(lang, basic.word, relativeTo);
                if (!relativeTo && _exploreCache.has(resolvedKey)) {
                    explore = await _exploreCache.get(resolvedKey)!;
                } else {
                    const exploreUrl = relativeTo
                        ? `/api/${lang}/word-explore/${encodeURIComponent(basic.word)}?relativeTo=${encodeURIComponent(relativeTo)}`
                        : `/api/${lang}/word-explore/${encodeURIComponent(basic.word)}`;
                    explore = await $fetch<WordExploreData>(exploreUrl).catch(() => null);
                }
            }

            return {
                basic,
                explore,
                definition: basicDefinitionToWordDefinition(basic),
            };
        })();

        _cache.set(key, promise);
        evictLRU(_cache, LRU_MAX);
        return promise;
    }

    return { fetchAll, prefetchExplore, prefetchBasic };
}
