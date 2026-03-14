import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { l as loadAllData, b as WORD_STATS_DIR } from '../../_/data-loader.mjs';
import { g as getTodaysIdx, i as idxToDate } from '../../_/word-selection.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'crypto';

let _statsCache = { data: null, ts: 0 };
const STATS_CACHE_TTL = 300;
const stats_get = defineEventHandler(() => {
  var _a, _b, _c, _d, _e;
  const now = Date.now() / 1e3;
  if (_statsCache.data && now - _statsCache.ts < STATS_CACHE_TTL) {
    return _statsCache.data;
  }
  const data = loadAllData();
  const todaysIdx = getTodaysIdx();
  const langStats = [];
  let totalWordsAll = 0;
  let totalDailyWordsAll = 0;
  let earliestStatsIdx = null;
  for (const lc of data.languageCodes) {
    const nWords = ((_a = data.wordLists[lc]) == null ? void 0 : _a.length) || 0;
    const nSupplement = ((_b = data.supplements[lc]) == null ? void 0 : _b.length) || 0;
    totalWordsAll += nWords + nSupplement;
    const daily = data.dailyWords[lc];
    const nDaily = daily ? daily.length : 0;
    const nBlocklist = ((_c = data.blocklists[lc]) == null ? void 0 : _c.size) || 0;
    const hasSchedule = !!data.curatedSchedules[lc];
    totalDailyWordsAll += nDaily || nWords;
    let langTotalPlays = 0;
    let langTotalWins = 0;
    const langDir = join(WORD_STATS_DIR, lc);
    if (existsSync(langDir)) {
      for (const fname of readdirSync(langDir)) {
        if (!fname.endsWith(".json")) continue;
        const day = parseInt(fname.slice(0, -5), 10);
        if (isNaN(day)) continue;
        try {
          const s = JSON.parse(readFileSync(join(langDir, fname), "utf-8"));
          langTotalPlays += s.total || 0;
          langTotalWins += s.wins || 0;
          if (earliestStatsIdx === null || day < earliestStatsIdx) {
            earliestStatsIdx = day;
          }
        } catch {
        }
      }
    }
    langStats.push({
      code: lc,
      name: ((_d = data.languages[lc]) == null ? void 0 : _d.language_name) || lc,
      name_native: ((_e = data.languages[lc]) == null ? void 0 : _e.language_name_native) || "",
      n_words: nWords,
      n_supplement: nSupplement,
      n_daily: nDaily,
      n_blocklist: nBlocklist,
      has_schedule: hasSchedule,
      total_plays: langTotalPlays,
      total_wins: langTotalWins,
      win_rate: langTotalPlays > 0 ? Math.round(langTotalWins / langTotalPlays * 100) : null
    });
  }
  langStats.sort((a, b) => b.n_words - a.n_words);
  const globalPlays = langStats.reduce((sum, ls) => sum + ls.total_plays, 0);
  const globalWins = langStats.reduce((sum, ls) => sum + ls.total_wins, 0);
  let statsSinceDate = null;
  if (earliestStatsIdx !== null) {
    statsSinceDate = idxToDate(earliestStatsIdx).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
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
    global_win_rate: globalPlays > 0 ? Math.round(globalWins / globalPlays * 100) : null,
    stats_since_date: statsSinceDate
  };
  _statsCache = { data: result, ts: now };
  return result;
});

export { stats_get as default };
//# sourceMappingURL=stats.get.mjs.map
