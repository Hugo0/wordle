import { d as defineEventHandler, g as getRouterParam, c as createError, r as readBody, e as getRequestHeader } from '../../../nitro/nitro.mjs';
import { b as WORD_STATS_DIR, l as loadAllData } from '../../../_/data-loader.mjs';
import { g as getTodaysIdx } from '../../../_/word-selection.mjs';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'crypto';

const STATS_MAX_IPS = 5e4;
const _statsSeenIps = /* @__PURE__ */ new Set();
let _statsSeenDay = null;
function loadWordStats(langCode, dayIdx) {
  const statsPath = join(WORD_STATS_DIR, langCode, `${dayIdx}.json`);
  if (!existsSync(statsPath)) return null;
  try {
    return JSON.parse(readFileSync(statsPath, "utf-8"));
  } catch {
    return null;
  }
}
async function updateWordStats(langCode, dayIdx, won, attempts) {
  const statsDir = join(WORD_STATS_DIR, langCode);
  const statsPath = join(statsDir, `${dayIdx}.json`);
  mkdirSync(statsDir, { recursive: true });
  let lockfile;
  try {
    lockfile = await import('proper-lockfile');
  } catch {
    _writeStats(statsPath, won, attempts);
    return;
  }
  if (!existsSync(statsPath)) {
    writeFileSync(statsPath, "{}", "utf-8");
  }
  let release;
  try {
    release = await lockfile.lock(statsPath, {
      stale: 1e4,
      retries: 0
    });
  } catch {
    return;
  }
  try {
    _writeStats(statsPath, won, attempts);
  } finally {
    if (release) await release();
  }
}
function _writeStats(statsPath, won, attempts) {
  let stats;
  try {
    if (existsSync(statsPath)) {
      const raw = readFileSync(statsPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.total) {
        stats = parsed;
      } else {
        stats = newStats();
      }
    } else {
      stats = newStats();
    }
  } catch {
    stats = newStats();
  }
  stats.total += 1;
  if (won) {
    stats.wins += 1;
    if (typeof attempts === "number" && attempts >= 1 && attempts <= 6) {
      stats.distribution[String(attempts)] = (stats.distribution[String(attempts)] || 0) + 1;
    }
  } else {
    stats.losses += 1;
  }
  writeFileSync(statsPath, JSON.stringify(stats), "utf-8");
}
function newStats() {
  return {
    total: 0,
    wins: 0,
    losses: 0,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 }
  };
}
function isDuplicateSubmission(langCode, dayIdx, clientId, todaysIdx) {
  if (_statsSeenDay !== todaysIdx) {
    _statsSeenIps.clear();
    _statsSeenDay = todaysIdx;
  }
  const dedupKey = `${langCode}:${dayIdx}:${clientId.slice(0, 64)}`;
  if (_statsSeenIps.has(dedupKey)) return true;
  if (_statsSeenIps.size < STATS_MAX_IPS) {
    _statsSeenIps.add(dedupKey);
  }
  return false;
}

const wordStats_post = defineEventHandler(async (event) => {
  var _a, _b;
  const lang = getRouterParam(event, "lang");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const body = await readBody(event);
  if (!body) {
    throw createError({ statusCode: 400, message: "Missing body" });
  }
  const { day_idx, attempts, won } = body;
  if (typeof day_idx !== "number" || typeof won !== "boolean") {
    throw createError({ statusCode: 400, message: "Invalid data" });
  }
  const tz = data.configs[lang].timezone || "UTC";
  const todaysIdx = getTodaysIdx(tz);
  if (day_idx !== todaysIdx) {
    throw createError({ statusCode: 403, message: "Not today" });
  }
  const clientId = body.client_id || ((_b = (_a = getRequestHeader(event, "x-forwarded-for")) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim()) || "unknown";
  if (isDuplicateSubmission(lang, day_idx, clientId, todaysIdx)) {
    const existing = loadWordStats(lang, day_idx);
    return existing || {};
  }
  try {
    await updateWordStats(lang, day_idx, won, attempts);
  } catch {
    console.warn(`[word-stats] Disk write failed for ${lang}`);
  }
  const updated = loadWordStats(lang, day_idx);
  return updated || {};
});

export { wordStats_post as default };
//# sourceMappingURL=word-stats.post.mjs.map
