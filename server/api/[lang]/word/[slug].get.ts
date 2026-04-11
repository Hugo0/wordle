/**
 * GET /api/[lang]/word/[slug] — word detail endpoint.
 *
 * Slug may be a numeric day index (legacy) or a word name (canonical).
 * Resolution + validation are delegated to `resolveWordSlug`, which also
 * fixes up Unicode word slugs for non-English languages.
 */
import { loadAllData, requireLang, langResponseFields } from '../../../utils/data-loader';
import {
    getTodaysIdx,
    getWiktLang,
    idxToDate,
    resolveWordSlug,
} from '../../../utils/word-selection';
import { loadWordStats } from '../../../utils/word-stats';
import { fetchDefinition } from '../../../utils/definitions';
import { checkWiktionaryExists } from '../../../utils/wiktionary';
import { getEmbedding, knnNearest, loadSemanticData } from '../../../utils/semantic';
import type { WordStats } from '~/utils/types';

// Module-level Set cache so we don't rebuild on every request. wordLists
// is loaded once at startup and never mutated, so the Set stays in sync.
const _wordSetCache = new Map<string, Set<string>>();
function getWordSet(lang: string, data: ReturnType<typeof loadAllData>): Set<string> {
    let s = _wordSetCache.get(lang);
    if (!s) {
        s = new Set(data.wordLists[lang] || []);
        _wordSetCache.set(lang, s);
    }
    return s;
}

/**
 * Reject obvious nonsense words (like `zyzzyx` or `asdfgh`) before we
 * hand back a page full of empty sections. Strategy by language:
 *   - English: must be in the semantic game's `validWords` dictionary
 *     (~75k English words) OR in the daily-target wordlist
 *   - Other languages: must be in the language's daily-target wordlist,
 *     which is a smaller set but the only vocabulary we know about
 *
 * Numeric day-index slugs bypass this entirely — `getWordForDay` always
 * returns a real word or errors.
 */
function wordIsRecognized(
    lang: string,
    word: string,
    data: ReturnType<typeof loadAllData>
): boolean {
    if (getWordSet(lang, data).has(word)) return true;
    // English gets the much larger semantic validator dictionary
    if (lang === 'en') {
        try {
            const sem = loadSemanticData();
            if (sem.validWords.has(word)) return true;
        } catch {
            // semantic data missing — fall through
        }
    }
    return false;
}

export default defineEventHandler(async (event) => {
    const { lang, data, config } = requireLang(event);
    const slug = decodeURIComponent(getRouterParam(event, 'slug')!);
    const timezone = config.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(timezone);

    const resolved = resolveWordSlug(lang, slug);
    if (resolved.kind === 'invalid') {
        throw createError({ statusCode: 400, message: 'Invalid slug' });
    }

    const word = resolved.word;
    const dayIdx = resolved.dayIdx;
    const resolvedFromIdx = resolved.kind === 'numeric';

    // Reject nonsense word-name slugs before rendering a page with
    // empty definition + empty map. Numeric-slug paths bypass this —
    // any valid day index yields a real word.
    if (resolved.kind === 'word' && word && !wordIsRecognized(lang, word, data)) {
        throw createError({
            statusCode: 404,
            message: `"${word}" isn't in our dictionary`,
        });
    }

    const isFuture = dayIdx != null && dayIdx > todaysIdx;
    const isToday = dayIdx != null && dayIdx === todaysIdx;
    const isPast = dayIdx != null && dayIdx < todaysIdx;

    let wordDate: string | null = null;
    let definition: {
        definition: string;
        definition_native?: string;
        part_of_speech?: string;
    } | null = null;
    let wordStats: WordStats | null = null;

    if (dayIdx != null && !isFuture) {
        wordDate = idxToDate(dayIdx).toISOString().slice(0, 10);
        wordStats = loadWordStats(lang, dayIdx);
    }

    // cacheOnly=1: skip LLM definition generation — only return disk-cached
    // or kaikki definitions. Used by the hover-prefetch so browsing neighbors
    // doesn't burn AI credits on obscure words.
    const query = getQuery(event);
    const cacheOnly = query.cacheOnly === '1' || query.cacheOnly === 'true';

    let wiktionaryExists = false;
    if (word) {
        const [defResult, wiktResult] = await Promise.all([
            fetchDefinition(word, lang, { cacheOnly }).catch(() => null),
            checkWiktionaryExists(word, lang).catch(() => null),
        ]);
        if (defResult) {
            definition = {
                definition: defResult.definition,
                definition_native: defResult.definitionNative || defResult.definition_native,
                part_of_speech: defResult.partOfSpeech || defResult.part_of_speech,
            };
        }
        wiktionaryExists = wiktResult === true;
    }

    // Nearest words for SSR internal link juice. Lightweight k-NN on the
    // in-memory semantic embeddings — ~5ms, zero LLM cost. Only for English
    // (where semantic data exists) and only the word names (no full explore).
    let nearestWords: string[] = [];
    if (word && lang === 'en') {
        try {
            const semData = loadSemanticData();
            const vec = getEmbedding(semData, word);
            if (vec) {
                nearestWords = knnNearest(semData, vec, 8, new Set([word])).map((n) => n.word);
            }
        } catch {
            // Semantic data not loaded — skip (non-English or cold start)
        }
    }

    return {
        ...langResponseFields(lang, config),
        day_idx: dayIdx,
        todays_idx: todaysIdx,
        is_past: isPast,
        is_today: isToday,
        is_future: isFuture,
        resolved_from_idx: resolvedFromIdx,
        word,
        word_date: wordDate,
        definition,
        word_stats: wordStats,
        wikt_lang: getWiktLang(lang),
        wiktionary_exists: wiktionaryExists,
        nearest_words: nearestWords,
    };
});
