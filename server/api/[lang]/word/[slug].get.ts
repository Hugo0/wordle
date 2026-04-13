/**
 * GET /api/[lang]/word/[slug] — word detail endpoint.
 *
 * Slug may be a numeric day index (legacy) or a word name (canonical).
 * Resolution + validation are delegated to `resolveWordSlug`, which also
 * fixes up Unicode word slugs for non-English languages.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import {
    loadAllData,
    requireLang,
    langResponseFields,
    WORD_IMAGES_DIR,
} from '../../../utils/data-loader';
import { wordImagePath } from '~/utils/wordUrls';
import {
    getTodaysIdx,
    getWiktLang,
    idxToDate,
    resolveWordSlug,
    findWordAppearances,
} from '../../../utils/word-selection';
import { loadWordStats } from '../../../utils/word-stats';
import { fetchDefinition } from '../../../utils/definitions';
import { checkWiktionaryExists } from '../../../utils/wiktionary';
import * as semanticDb from '~/server/utils/_semantic-db';
import { getValidWords } from '~/server/plugins/semantic-warmup';
import { prisma } from '~/server/utils/prisma';
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
    // English gets the much larger semantic valid words set (loaded at startup, 2MB)
    if (lang === 'en') {
        const validWords = getValidWords();
        if (validWords.size > 0 && validWords.has(word)) return true;
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
        wordStats = await loadWordStats(lang, dayIdx);
    }

    const query = getQuery(event);
    const clientCacheOnly = query.cacheOnly === '1' || query.cacheOnly === 'true';
    // Only generate LLM definitions for words in the game's word list (5-letter
    // daily candidates). Other words (semantic vocab, neighbor links) use cacheOnly
    // to avoid burning LLM credits on the 75K-word tail that bots crawl.
    const isGameWord = getWordSet(lang, data).has(word ?? '');
    const cacheOnly = clientCacheOnly || !isGameWord;

    let wiktionaryExists = false;
    let dictionary: {
        senses: unknown;
        etymology?: string | null;
        pronunciation?: string | null;
        forms?: unknown;
        translations?: unknown;
    } | null = null;

    if (word) {
        const [defResult, wiktResult, dictRow] = await Promise.all([
            fetchDefinition(word, lang, { cacheOnly }).catch(() => null),
            checkWiktionaryExists(word, lang).catch(() => null),
            prisma.definition
                .findUnique({
                    where: { lang_word: { lang, word: word.toLowerCase() } },
                    select: {
                        senses: true,
                        etymology: true,
                        pronunciation: true,
                        forms: true,
                        translations: true,
                    },
                })
                .catch(() => null),
        ]);
        if (defResult) {
            definition = {
                definition: defResult.definition,
                definition_native: defResult.definitionNative || defResult.definition_native,
                part_of_speech: defResult.partOfSpeech || defResult.part_of_speech,
            };
        }
        wiktionaryExists = wiktResult === true;
        if (dictRow?.senses || dictRow?.translations) {
            // Tag translations: linkable (word exists in our lists) vs display-only
            let translationsList: Array<{
                code: string;
                word: string;
                hasPage: boolean;
                name: string;
            }> | null = null;
            if (dictRow?.translations && typeof dictRow.translations === 'object') {
                const raw = dictRow.translations as Record<string, string>;
                translationsList = [];
                for (const [code, tw] of Object.entries(raw)) {
                    if (data.languageCodes.includes(code) && code !== lang) {
                        const wordSet = getWordSet(code, data);
                        const langConfig = data.configs[code];
                        translationsList.push({
                            code,
                            word: tw,
                            hasPage: wordSet.has(tw.toLowerCase()),
                            name: langConfig?.name || code,
                        });
                    }
                }
                translationsList.sort((a, b) => a.name.localeCompare(b.name));
                if (translationsList.length === 0) translationsList = null;
            }
            dictionary = {
                senses: dictRow?.senses || null,
                etymology: dictRow?.etymology,
                pronunciation: dictRow?.pronunciation,
                forms: dictRow?.forms,
                translations: translationsList,
            };
        }
    }

    // Nearest words for SSR internal link juice via pgvector HNSW — ~10ms.
    // Only for English (where semantic data exists).
    let nearestWords: string[] = [];
    if (word && lang === 'en') {
        try {
            const neighbors = await semanticDb.knnNearest(lang, word, 8, [word]);
            nearestWords = neighbors.map((n) => n.word);
        } catch {
            // DB unavailable — skip
        }
    }

    let imageUrl: string | null = null;
    if (word) {
        const imgPath = join(WORD_IMAGES_DIR, lang, `${word.toLowerCase()}.webp`);
        if (existsSync(imgPath)) {
            imageUrl = wordImagePath(lang, word, dayIdx);
        }
    }

    const appearances = word ? findWordAppearances(lang, word) : [];

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
        image_url: imageUrl,
        appearances,
        dictionary,
    };
});
