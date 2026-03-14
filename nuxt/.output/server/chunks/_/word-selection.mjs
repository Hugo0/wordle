import { createHash } from 'crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { c as WORD_HISTORY_DIR, l as loadAllData, M as MIGRATION_DAY_IDX } from './data-loader.mjs';

function getTodaysIdx(timezone = "UTC") {
  const now = /* @__PURE__ */ new Date();
  let dateStr;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    dateStr = formatter.format(now);
  } catch {
    dateStr = now.toISOString().slice(0, 10);
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const localDate = new Date(Date.UTC(y, m - 1, d));
  const epoch = new Date(Date.UTC(1970, 0, 1));
  const nDays = Math.floor(
    (localDate.getTime() - epoch.getTime()) / (86400 * 1e3)
  );
  return nDays - 18992 + 195;
}
function idxToDate(dayIdx) {
  const nDays = dayIdx + 18992 - 195;
  return new Date(Date.UTC(1970, 0, 1 + nDays));
}
function wordHash(word, langCode) {
  const h = createHash("sha256").update(`${langCode}:${word}`).digest();
  return h.readBigUInt64BE(0);
}
function dayHash(dayIdx, langCode) {
  const h = createHash("sha256").update(`${langCode}:day:${dayIdx}`).digest();
  return h.readBigUInt64BE(0);
}
function getDailyWordConsistentHash(words, blocklist, dayIdx, langCode) {
  const dayH = dayHash(dayIdx, langCode);
  const candidates = [];
  for (const word of words) {
    if (!blocklist.has(word)) {
      candidates.push([wordHash(word, langCode), word]);
    }
  }
  if (candidates.length === 0) {
    return words[0] || "";
  }
  candidates.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  for (const [wh, word] of candidates) {
    if (wh >= dayH) return word;
  }
  return candidates[0][1];
}
function getDailyWordLegacy(words, blocklist, dayIdx) {
  const listLen = words.length;
  if (blocklist.size === 0) {
    return words[dayIdx % listLen];
  }
  for (let offset = 0; offset < listLen; offset++) {
    const idx = (dayIdx + offset) % listLen;
    const word = words[idx];
    if (!blocklist.has(word)) return word;
  }
  return words[dayIdx % listLen];
}
function computeWordForDay(langCode, dayIdx) {
  const data = loadAllData();
  const wordList = data.wordLists[langCode];
  const blocklist = data.blocklists[langCode];
  const dailyWords = data.dailyWords[langCode];
  const curatedSchedule = data.curatedSchedules[langCode];
  if (dayIdx <= MIGRATION_DAY_IDX) {
    return getDailyWordLegacy(wordList, /* @__PURE__ */ new Set(), dayIdx);
  }
  const scheduleIdx = dayIdx - MIGRATION_DAY_IDX - 1;
  if (curatedSchedule && scheduleIdx < curatedSchedule.length) {
    return curatedSchedule[scheduleIdx];
  }
  if (dailyWords) {
    return getDailyWordConsistentHash(dailyWords, /* @__PURE__ */ new Set(), dayIdx, langCode);
  }
  return getDailyWordConsistentHash(wordList, blocklist, dayIdx, langCode);
}
function getWordForDay(langCode, dayIdx) {
  const cachePath = join(WORD_HISTORY_DIR, langCode, `${dayIdx}.txt`);
  if (existsSync(cachePath)) {
    try {
      const cached = readFileSync(cachePath, "utf-8").trim();
      if (cached) return cached;
    } catch {
    }
  }
  const word = computeWordForDay(langCode, dayIdx);
  const todaysIdx = getTodaysIdx();
  if (dayIdx <= todaysIdx) {
    const langDir = join(WORD_HISTORY_DIR, langCode);
    mkdirSync(langDir, { recursive: true });
    const tmpPath = cachePath + ".tmp";
    try {
      writeFileSync(tmpPath, word, "utf-8");
      const { renameSync } = require("fs");
      renameSync(tmpPath, cachePath);
    } catch {
    }
  }
  return word;
}

export { getWordForDay as a, getTodaysIdx as g, idxToDate as i };
//# sourceMappingURL=word-selection.mjs.map
