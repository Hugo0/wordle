import { readdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

function resolveDataDir() {
  const envDataDir = process.env.NUXT_WEBAPP_DATA_DIR;
  if (envDataDir && existsSync(envDataDir)) return envDataDir;
  const candidates = [
    resolve(process.cwd(), "..", "webapp", "data"),
    resolve(process.cwd(), "webapp", "data"),
    resolve(__dirname, "..", "..", "..", "webapp", "data")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Cannot find webapp/data/ directory. Tried: ${candidates.join(", ")}`
  );
}
const DATA_DIR = resolveDataDir();
const PERSISTENT_DIR = process.env.DATA_DIR || resolve(DATA_DIR, "..", "static");
const WORD_IMAGES_DIR = join(PERSISTENT_DIR, "word-images");
const WORD_DEFS_DIR = join(PERSISTENT_DIR, "word-defs");
const WORD_STATS_DIR = join(PERSISTENT_DIR, "word-stats");
const WORD_HISTORY_DIR = join(PERSISTENT_DIR, "word-history");
const MIGRATION_DAY_IDX = 1681;
function readTextLines(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}
function readNonCommentLines(filePath) {
  return readTextLines(filePath).filter((l) => !l.startsWith("#"));
}
function readJsonFile(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}
function loadCharacters(lang) {
  const charPath = join(DATA_DIR, "languages", lang, `${lang}_characters.txt`);
  if (existsSync(charPath)) {
    return readTextLines(charPath);
  }
  const wordsPath = join(DATA_DIR, "languages", lang, `${lang}_5words.txt`);
  const characters = /* @__PURE__ */ new Set();
  for (const line of readTextLines(wordsPath)) {
    for (const char of line) {
      characters.add(char);
    }
  }
  const sorted = [...characters].sort();
  writeFileSync(charPath, sorted.join("\n") + "\n", "utf-8");
  return sorted;
}
function loadWords(lang, langConfig) {
  const wordsPath = join(DATA_DIR, "languages", lang, `${lang}_5words.txt`);
  let words = readTextLines(wordsPath);
  const useGraphemes = (langConfig == null ? void 0 : langConfig.grapheme_mode) === "true";
  const characters = new Set(loadCharacters(lang));
  if (useGraphemes) {
    const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
    words = words.filter((w) => {
      const graphemes = [...segmenter.segment(w)].map((s) => s.segment);
      return graphemes.length === 5;
    });
  } else {
    words = words.map((w) => w.toLowerCase()).filter((w) => w.length === 5 && /^[\p{L}]+$/u.test(w));
  }
  words = words.filter((w) => [...w].every((c) => characters.has(c)));
  const shuffledPath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_5words_shuffled.json`
  );
  if (existsSync(shuffledPath)) {
    const shuffled = readJsonFile(shuffledPath);
    if (shuffled && shuffled.length > 0) return shuffled;
  }
  let nInOrder = 0;
  let lastLetter = "";
  for (const word of words) {
    if (word[0] <= lastLetter) nInOrder++;
    lastLetter = word[0];
  }
  if (words.length > 0 && nInOrder / words.length > 0.8) {
    console.warn(
      `[data-loader] ${lang} words appear sorted but no _shuffled.json found. Run: uv run python scripts/preshuffle_word_lists.py`
    );
  }
  return words;
}
function loadSupplementalWords(lang) {
  const supplementPath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_5words_supplement.txt`
  );
  const characters = new Set(loadCharacters(lang));
  return readTextLines(supplementPath).filter(
    (w) => [...w].every((c) => characters.has(c))
  );
}
function loadBlocklist(lang) {
  const blocklistPath = join(DATA_DIR, "languages", lang, `${lang}_blocklist.txt`);
  const lines = readNonCommentLines(blocklistPath);
  return new Set(lines.map((w) => w.toLowerCase()));
}
function loadDailyWords(lang) {
  const dailyPath = join(DATA_DIR, "languages", lang, `${lang}_daily_words.txt`);
  const lines = readNonCommentLines(dailyPath).map((w) => w.toLowerCase());
  return lines.length > 0 ? lines : null;
}
function loadCuratedSchedule(lang) {
  const schedulePath = join(
    DATA_DIR,
    "languages",
    lang,
    `${lang}_curated_schedule.txt`
  );
  const lines = readNonCommentLines(schedulePath).map((w) => w.toLowerCase());
  return lines.length > 0 ? lines : null;
}
let _defaultConfig = null;
function loadLanguageConfig(lang) {
  if (!_defaultConfig) {
    _defaultConfig = readJsonFile(
      join(DATA_DIR, "default_language_config.json")
    );
  }
  const defaultConfig = _defaultConfig;
  const langConfigPath = join(DATA_DIR, "languages", lang, "language_config.json");
  const langConfig = readJsonFile(langConfigPath);
  if (!langConfig) return defaultConfig;
  const merged = { ...defaultConfig };
  for (const [key, value] of Object.entries(langConfig)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value) && key in merged && typeof merged[key] === "object") {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
function loadKeyboard(lang) {
  const keyboardPath = join(DATA_DIR, "languages", lang, `${lang}_keyboard.json`);
  const raw = readJsonFile(keyboardPath);
  if (!raw) return { default: null, layouts: {} };
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { default: null, layouts: {} };
    return {
      default: "default",
      layouts: { default: { label: "Default", rows: raw } }
    };
  }
  if (typeof raw !== "object") return { default: null, layouts: {} };
  const layoutsBlock = raw.layouts;
  const sourceLayouts = typeof layoutsBlock === "object" && layoutsBlock !== null ? layoutsBlock : Object.fromEntries(
    Object.entries(raw).filter(([k]) => k !== "default")
  );
  const normalizedLayouts = {};
  for (const [name, value] of Object.entries(sourceLayouts)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const v = value;
      normalizedLayouts[name] = {
        label: v.label || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        rows: v.rows || []
      };
    } else {
      normalizedLayouts[name] = {
        label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        rows: value
      };
    }
  }
  let defaultLayout = raw.default;
  if (!defaultLayout || !(defaultLayout in normalizedLayouts)) {
    defaultLayout = Object.keys(normalizedLayouts)[0];
  }
  return { default: defaultLayout || null, layouts: normalizedLayouts };
}
let _cachedData = null;
function loadAllData() {
  if (_cachedData) return _cachedData;
  console.log("[data-loader] Loading data...");
  const langDir = join(DATA_DIR, "languages");
  const languageCodes = readdirSync(langDir).filter(
    (f) => existsSync(join(langDir, f, `${f}_5words.txt`))
  );
  const configs = {};
  const characters = {};
  for (const lc of languageCodes) {
    configs[lc] = loadLanguageConfig(lc);
    characters[lc] = loadCharacters(lc);
  }
  const wordLists = {};
  const supplements = {};
  const blocklists = {};
  const dailyWords = {};
  const curatedSchedules = {};
  const keyboards = {};
  for (const lc of languageCodes) {
    wordLists[lc] = loadWords(lc, configs[lc]);
    supplements[lc] = loadSupplementalWords(lc);
    blocklists[lc] = loadBlocklist(lc);
    dailyWords[lc] = loadDailyWords(lc);
    curatedSchedules[lc] = loadCuratedSchedule(lc);
    keyboards[lc] = loadKeyboard(lc);
  }
  const languages = {};
  for (const lc of languageCodes) {
    const config = configs[lc];
    languages[lc] = {
      language_name: config.name || lc,
      language_name_native: config.name_native || config.name || lc,
      language_code: lc
    };
  }
  const todaysIdx = getTodaysIdx();
  const daysSinceMigration = todaysIdx - MIGRATION_DAY_IDX;
  for (const lc of languageCodes) {
    const schedule = curatedSchedules[lc];
    const scheduleLen = schedule ? schedule.length : 0;
    if (scheduleLen < daysSinceMigration && dailyWords[lc]) {
      console.warn(
        `[data-loader] WORD SAFETY: ${lc} curated_schedule has ${scheduleLen} entries but ${daysSinceMigration} days since migration. Run: uv run python scripts/freeze_past_words.py ${lc}`
      );
    }
  }
  const stats = {
    totalLanguages: languageCodes.length,
    withSupplements: Object.values(supplements).filter((s) => s.length > 0).length
  };
  console.log(`[data-loader] Loaded ${stats.totalLanguages} languages (${stats.withSupplements} with supplements)`);
  _cachedData = {
    languageCodes,
    configs,
    wordLists,
    supplements,
    blocklists,
    dailyWords,
    curatedSchedules,
    characters,
    keyboards,
    languages
  };
  return _cachedData;
}
function getTodaysIdx(timezone = "UTC") {
  const now = /* @__PURE__ */ new Date();
  let localDate;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.format(now);
    localDate = /* @__PURE__ */ new Date(parts + "T00:00:00Z");
  } catch {
    localDate = now;
  }
  const epoch = /* @__PURE__ */ new Date("1970-01-01T00:00:00Z");
  const nDays = Math.floor((localDate.getTime() - epoch.getTime()) / (86400 * 1e3));
  return nDays - 18992 + 195;
}

export { MIGRATION_DAY_IDX as M, WORD_IMAGES_DIR as W, WORD_DEFS_DIR as a, WORD_STATS_DIR as b, WORD_HISTORY_DIR as c, loadAllData as l };
//# sourceMappingURL=data-loader.mjs.map
