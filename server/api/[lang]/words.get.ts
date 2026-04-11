/**
 * GET /api/[lang]/words — paginated word archive.
 *
 * Returns past daily words with definitions and stats for the words hub page.
 * Query params:
 *   page (default 1) — page number (1-indexed, newest first)
 *   per_page (default 30) — items per page
 *   mode (default 'classic') — game mode: classic, dordle, quordle, octordle,
 *         sedecordle, duotrigordle, speed, semantic
 *
 * Non-classic modes use a 1-based day index starting April 11, 2026.
 * Multi-board modes return `words: string[]` per entry (N words per day).
 * Semantic mode is English-only and returns target words from the semantic pool.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { WORD_DEFS_DIR, requireLang, langResponseFields } from '../../utils/data-loader';
import { getTodaysIdx, getWordForDay, getWordsForDay, idxToDate } from '../../utils/word-selection';
import { loadWordStats } from '../../utils/word-stats';
import { getTodaysIdx as getTodaysIdxLib, toModeDayIdx, fromModeDayIdx } from '../../lib/day-index';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

const WORDS_PER_PAGE = 30;

/** Modes that use the new mode day index (1-based from April 11, 2026). */
const MODE_DAY_IDX_MODES = new Set([
    'dordle',
    'quordle',
    'octordle',
    'sedecordle',
    'duotrigordle',
    'speed',
    'semantic',
]);

/** Valid archive modes. */
const ARCHIVE_MODES = new Set([
    'classic',
    'dordle',
    'quordle',
    'octordle',
    'sedecordle',
    'duotrigordle',
    'speed',
    'semantic',
]);

/**
 * Read a cached definition from disk without triggering LLM generation.
 */
function readCachedDefinition(
    word: string,
    langCode: string
): { definition: string; part_of_speech?: string } | null {
    const cachePath = join(WORD_DEFS_DIR, langCode, `${word.toLowerCase()}.json`);
    if (!existsSync(cachePath)) return null;
    try {
        const loaded = JSON.parse(readFileSync(cachePath, 'utf-8'));
        if (loaded.not_found || !loaded.definition) return null;
        return {
            definition: loaded.definition_native || loaded.definition,
            part_of_speech: loaded.part_of_speech || undefined,
        };
    } catch {
        return null;
    }
}

/**
 * Pick semantic daily target — must match the logic in semantic/start.post.ts.
 */
function pickSemanticDailyTarget(targets: readonly string[], lang: string, dayIdx: number): string {
    let h = 2166136261;
    const key = `${lang}-${dayIdx}`;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = (h * 16777619) >>> 0;
    }
    return targets[h % targets.length]!;
}

/**
 * Load semantic targets list (lazy, cached).
 */
let _semanticTargets: string[] | null = null;
async function loadSemanticTargets(): Promise<string[]> {
    if (_semanticTargets) return _semanticTargets;
    try {
        const { loadSemanticDataSafe } = await import('../../utils/semantic');
        const data = loadSemanticDataSafe();
        _semanticTargets = data.targets;
        return _semanticTargets!;
    } catch {
        return [];
    }
}

export default defineEventHandler(async (event) => {
    const { lang, data, config } = requireLang(event);

    const query = getQuery(event);
    const page = Math.max(1, parseInt((query.page as string) || '1', 10));
    const mode = ((query.mode as string) || 'classic') as GameMode;
    const timezone = config.timezone || 'UTC';
    const classicTodaysIdx = getTodaysIdxLib(timezone);

    if (!ARCHIVE_MODES.has(mode)) {
        throw createError({ statusCode: 400, message: `Invalid mode: ${mode}` });
    }

    // Semantic is English-only
    if (mode === 'semantic' && lang !== 'en') {
        return {
            ...langResponseFields(lang, config),
            mode,
            todays_idx: 0,
            page: 1,
            total_pages: 0,
            words_per_page: WORDS_PER_PAGE,
            words: [],
        };
    }

    // Determine day count based on mode
    const usesModeDayIdx = MODE_DAY_IDX_MODES.has(mode);
    const todaysModeIdx = usesModeDayIdx ? (toModeDayIdx(classicTodaysIdx) ?? 0) : classicTodaysIdx;

    // If mode hasn't launched yet, return empty
    if (todaysModeIdx <= 0) {
        return {
            ...langResponseFields(lang, config),
            mode,
            todays_idx: 0,
            page: 1,
            total_pages: 0,
            words_per_page: WORDS_PER_PAGE,
            words: [],
        };
    }

    const totalPages = Math.ceil(todaysModeIdx / WORDS_PER_PAGE);

    if (page > totalPages) {
        throw createError({ statusCode: 404, message: 'Page not found' });
    }

    // Compute indices for this page (newest first)
    const startIdx = todaysModeIdx - (page - 1) * WORDS_PER_PAGE;
    const endIdx = Math.max(startIdx - WORDS_PER_PAGE, 0);

    const modeConfig = GAME_MODE_CONFIG[mode];
    const boardCount = modeConfig?.boardCount ?? 1;

    const words: Array<{
        day_idx: number;
        word: string | null;
        words: string[] | null;
        date: string;
        definition: { definition: string; part_of_speech?: string } | null;
        stats: { total: number; wins: number } | null;
        is_today: boolean;
        board_count: number;
    }> = [];

    for (let idx = startIdx; idx > endIdx; idx--) {
        const isToday = idx === todaysModeIdx;
        // Convert mode day index back to classic index for word selection and date
        const classicIdx = usesModeDayIdx ? fromModeDayIdx(idx) : idx;
        const date = idxToDate(classicIdx);

        let word: string | null = null;
        let wordList: string[] | null = null;
        let defResult: { definition: string; part_of_speech?: string } | null = null;

        if (!isToday) {
            if (mode === 'semantic') {
                const targets = await loadSemanticTargets();
                word = targets.length > 0 ? pickSemanticDailyTarget(targets, lang, idx) : null;
            } else if (boardCount > 1) {
                wordList = getWordsForDay(lang, classicIdx, boardCount);
                word = wordList[0] ?? null;
            } else {
                word = getWordForDay(lang, classicIdx);
            }

            // Definitions only make sense for single-word modes
            if (word && boardCount === 1) {
                defResult = readCachedDefinition(word, lang);
            }
        }

        const stats = isToday ? null : loadWordStats(lang, classicIdx);

        words.push({
            day_idx: idx,
            word: isToday ? null : word,
            words: isToday ? null : wordList,
            date: date.toISOString().slice(0, 10),
            definition: defResult,
            stats: stats ? { total: stats.total, wins: stats.wins } : null,
            is_today: isToday,
            board_count: boardCount,
        });
    }

    return {
        ...langResponseFields(lang, config),
        mode,
        todays_idx: todaysModeIdx,
        page,
        total_pages: totalPages,
        words_per_page: WORDS_PER_PAGE,
        words,
    };
});
