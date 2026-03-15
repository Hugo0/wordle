/**
 * GET /api/stats — site-wide statistics aggregation.
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadAllData, WORD_STATS_DIR } from '../utils/data-loader';
import { getTodaysIdx, idxToDate } from '../utils/word-selection';

let _statsCache: { data: any; ts: number } = { data: null, ts: 0 };
const STATS_CACHE_TTL = 300; // 5 minutes

export default defineEventHandler(() => {
    const now = Date.now() / 1000;
    if (_statsCache.data && now - _statsCache.ts < STATS_CACHE_TTL) {
        return _statsCache.data;
    }

    const data = loadAllData();
    const todaysIdx = getTodaysIdx();
    const langStats: any[] = [];
    let totalWordsAll = 0;
    let totalDailyWordsAll = 0;
    let earliestStatsIdx: number | null = null;

    for (const lc of data.languageCodes) {
        const nWords = data.wordLists[lc]?.length || 0;
        totalWordsAll += nWords;

        const daily = data.dailyWords[lc];
        const nDaily = daily ? daily.length : 0;
        const nBlocklist = data.blocklists[lc]?.size || 0;
        totalDailyWordsAll += nDaily || nWords;

        let langTotalPlays = 0;
        let langTotalWins = 0;
        const langDir = join(WORD_STATS_DIR, lc);
        if (existsSync(langDir)) {
            for (const fname of readdirSync(langDir)) {
                if (!fname.endsWith('.json')) continue;
                const day = parseInt(fname.slice(0, -5), 10);
                if (isNaN(day)) continue;
                try {
                    const s = JSON.parse(readFileSync(join(langDir, fname), 'utf-8'));
                    langTotalPlays += s.total || 0;
                    langTotalWins += s.wins || 0;
                    if (earliestStatsIdx === null || day < earliestStatsIdx) {
                        earliestStatsIdx = day;
                    }
                } catch {}
            }
        }

        langStats.push({
            code: lc,
            name: data.languages[lc]?.language_name || lc,
            name_native: data.languages[lc]?.language_name_native || '',
            n_words: nWords,
            n_daily: nDaily,
            n_blocklist: nBlocklist,
            total_plays: langTotalPlays,
            total_wins: langTotalWins,
            win_rate:
                langTotalPlays > 0 ? Math.round((langTotalWins / langTotalPlays) * 100) : null,
        });
    }

    langStats.sort((a, b) => a.name.localeCompare(b.name));

    const globalPlays = langStats.reduce((sum, ls) => sum + ls.total_plays, 0);
    const globalWins = langStats.reduce((sum, ls) => sum + ls.total_wins, 0);

    let statsSinceDate: string | null = null;
    if (earliestStatsIdx !== null) {
        statsSinceDate = idxToDate(earliestStatsIdx).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    const nCurated = langStats.filter((ls) => ls.n_daily > 0).length;

    const result = {
        lang_stats: langStats,
        total_languages: data.languageCodes.length,
        total_words: totalWordsAll,
        total_daily_words: totalDailyWordsAll,
        n_curated: nCurated,
        total_puzzles: todaysIdx * data.languageCodes.length,
        todays_idx: todaysIdx,
        global_plays: globalPlays,
        global_wins: globalWins,
        global_win_rate: globalPlays > 0 ? Math.round((globalWins / globalPlays) * 100) : null,
        stats_since_date: statsSinceDate,
    };

    _statsCache = { data: result, ts: now };
    return result;
});
