/**
 * GET /api/[lang]/data — language game data.
 *
 * Returns word list, characters, config, keyboard, daily word info.
 * For multi-board modes (?mode=dordle|tridle|quordle), also returns
 * todays_words: an array of N distinct daily words.
 */
import { requireLang } from '../../utils/data-loader';
import { buildLanguageSession } from '../../utils/language-builder';
import { getWordsForDay } from '../../utils/word-selection';
import { toModeDayIdx } from '../../lib/day-index';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

export default defineEventHandler((event) => {
    const { lang, data } = requireLang(event);

    const query = getQuery(event);
    const layout = (query.layout as string) || undefined;
    const mode = (query.mode as string) || 'classic';

    const session = buildLanguageSession(lang, layout);

    // ?minimal=1: skip the full word list (114KB for English). Used by game
    // modes that validate server-side (semantic, speed, unlimited) and don't
    // need the word list on the client. Classic + multiboard need it for
    // client-side "not a valid word" checks.
    const minimal = query.minimal === '1' || query.minimal === 'true';

    // For non-classic modes, provide a 1-based index starting April 11 2026
    const modeDayIdx = mode !== 'classic' ? toModeDayIdx(session.todaysIdx) : null;

    const response = {
        word_list: minimal ? [] : session.wordList,
        daily_words: data.dailyWords[lang] || ([] as string[]),
        characters: session.characters,
        config: session.config,
        todays_idx: session.todaysIdx,
        mode_day_idx: modeDayIdx,
        todays_word: session.dailyWord,
        timezone_offset: session.timezoneOffset,
        keyboard: session.keyboard,
        keyboard_layouts: session.keyboardLayouts,
        keyboard_layout_name: session.keyboardLayoutName,
        key_diacritic_hints: session.keyDiacriticHints,
        todays_words: undefined as string[] | undefined,
        speed_daily_words: undefined as string[] | undefined,
    };

    // Play type: 'daily' (default) or 'unlimited'. When unlimited, skip
    // daily word computation — the client picks random words.
    const play = (query.play as string) || 'daily';

    if (play === 'daily') {
        // Multi-board modes: N distinct daily words
        const modeConfig = GAME_MODE_CONFIG[mode as GameMode];
        if (modeConfig && modeConfig.boardCount > 1) {
            response.todays_words = getWordsForDay(lang, session.todaysIdx, modeConfig.boardCount);
        }

        // Daily speed: deterministic sequence of 50 words (same for everyone)
        if (mode === 'speed') {
            response.speed_daily_words = getWordsForDay(lang, session.todaysIdx, 50);
        }
    }

    return response;
});
