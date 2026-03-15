/**
 * Data loading utilities — port of webapp/app.py data loading functions.
 *
 * Loads word lists, configs, keyboards, blocklists, and curated schedules
 * from the webapp/data/ directory at startup. All data is cached in memory.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import type { LanguageConfig, KeyboardConfig, KeyboardLayout } from '~/utils/types';

// ---------------------------------------------------------------------------
// Resolve data directory
// ---------------------------------------------------------------------------

function resolveDataDir(): string {
    // Try env var first (production)
    const envDataDir = process.env.NUXT_WEBAPP_DATA_DIR;
    if (envDataDir && existsSync(envDataDir)) return envDataDir;

    // Development: resolve relative to process cwd
    const candidates = [
        resolve(process.cwd(), '..', 'webapp', 'data'),
        resolve(process.cwd(), 'webapp', 'data'),
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    throw new Error(
        `Cannot find webapp/data/ directory. Tried: ${candidates.join(', ')}`,
    );
}

const DATA_DIR = resolveDataDir();

// Persistent data directory for runtime-generated files
const PERSISTENT_DIR = process.env.DATA_DIR || resolve(DATA_DIR, '..', 'static');
export const WORD_IMAGES_DIR = join(PERSISTENT_DIR, 'word-images');
export const WORD_DEFS_DIR = join(PERSISTENT_DIR, 'word-defs');
export const WORD_STATS_DIR = join(PERSISTENT_DIR, 'word-stats');
export const WORD_HISTORY_DIR = join(PERSISTENT_DIR, 'word-history');

// Migration cutoff: days before this use legacy shuffle, days after use consistent hashing
export const MIGRATION_DAY_IDX = 1681;

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

function readTextLines(filePath: string): string[] {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
}

function readNonCommentLines(filePath: string): string[] {
    return readTextLines(filePath).filter((l) => !l.startsWith('#'));
}

function readJsonFile<T>(filePath: string): T | null {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

// ---------------------------------------------------------------------------
// Character loading
// ---------------------------------------------------------------------------

export function loadCharacters(lang: string): string[] {
    const charPath = join(DATA_DIR, 'languages', lang, `${lang}_characters.txt`);
    if (existsSync(charPath)) {
        return readTextLines(charPath);
    }
    // Auto-generate from word list
    const wordsPath = join(DATA_DIR, 'languages', lang, `${lang}_5words.txt`);
    const characters = new Set<string>();
    for (const line of readTextLines(wordsPath)) {
        for (const char of line) {
            characters.add(char);
        }
    }
    const sorted = [...characters].sort();
    // Write auto-generated file
    writeFileSync(charPath, sorted.join('\n') + '\n', 'utf-8');
    return sorted;
}

// ---------------------------------------------------------------------------
// Word list loading
// ---------------------------------------------------------------------------

export function loadWords(lang: string, langConfig: LanguageConfig | null): string[] {
    const wordsPath = join(DATA_DIR, 'languages', lang, `${lang}_5words.txt`);
    let words = readTextLines(wordsPath);

    const useGraphemes = langConfig?.grapheme_mode === 'true';
    const characters = new Set(loadCharacters(lang));

    // QA filter
    if (useGraphemes) {
        // For grapheme-mode languages, skip isalpha check
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        words = words.filter((w) => {
            const graphemes = [...segmenter.segment(w)].map((s) => s.segment);
            return graphemes.length === 5;
        });
    } else {
        words = words
            .map((w) => w.toLowerCase())
            .filter((w) => w.length === 5 && /^[\p{L}]+$/u.test(w));
    }

    // Filter by valid characters
    words = words.filter((w) => [...w].every((c) => characters.has(c)));

    // Check if list is sorted and needs shuffling
    // For legacy algorithm compatibility, we load pre-shuffled lists
    // The shuffled list should be pre-computed by the Python script
    const shuffledPath = join(
        DATA_DIR,
        'languages',
        lang,
        `${lang}_5words_shuffled.json`,
    );
    if (existsSync(shuffledPath)) {
        const shuffled = readJsonFile<string[]>(shuffledPath);
        if (shuffled && shuffled.length > 0) return shuffled;
    }

    // Detect if list is sorted (80%+ in order) — same heuristic as Python
    let nInOrder = 0;
    let lastLetter = '';
    for (const word of words) {
        if (word[0]! <= lastLetter) nInOrder++;
        lastLetter = word[0]!;
    }
    if (words.length > 0 && nInOrder / words.length > 0.8) {
        console.warn(
            `[data-loader] ${lang} words appear sorted but no _shuffled.json found. ` +
                `Run: uv run python scripts/preshuffle_word_lists.py`,
        );
    }

    return words;
}

export function loadSupplementalWords(lang: string): string[] {
    const supplementPath = join(
        DATA_DIR,
        'languages',
        lang,
        `${lang}_5words_supplement.txt`,
    );
    const characters = new Set(loadCharacters(lang));
    return readTextLines(supplementPath).filter((w) =>
        [...w].every((c) => characters.has(c)),
    );
}

export function loadBlocklist(lang: string): Set<string> {
    const blocklistPath = join(DATA_DIR, 'languages', lang, `${lang}_blocklist.txt`);
    const lines = readNonCommentLines(blocklistPath);
    return new Set(lines.map((w) => w.toLowerCase()));
}

export function loadDailyWords(lang: string): string[] | null {
    const dailyPath = join(DATA_DIR, 'languages', lang, `${lang}_daily_words.txt`);
    const lines = readNonCommentLines(dailyPath).map((w) => w.toLowerCase());
    return lines.length > 0 ? lines : null;
}

export function loadCuratedSchedule(lang: string): string[] | null {
    const schedulePath = join(
        DATA_DIR,
        'languages',
        lang,
        `${lang}_curated_schedule.txt`,
    );
    const lines = readNonCommentLines(schedulePath).map((w) => w.toLowerCase());
    return lines.length > 0 ? lines : null;
}

// ---------------------------------------------------------------------------
// Language config loading
// ---------------------------------------------------------------------------

let _defaultConfig: Record<string, any> | null = null;

export function loadLanguageConfig(lang: string): LanguageConfig {
    if (!_defaultConfig) {
        _defaultConfig = readJsonFile<Record<string, any>>(
            join(DATA_DIR, 'default_language_config.json'),
        )!;
    }
    const defaultConfig = _defaultConfig;

    const langConfigPath = join(DATA_DIR, 'languages', lang, 'language_config.json');
    const langConfig = readJsonFile<Record<string, any>>(langConfigPath);

    if (!langConfig) return defaultConfig as unknown as LanguageConfig;

    // Deep merge: language-specific values override defaults
    const merged: Record<string, any> = { ...defaultConfig };
    for (const [key, value] of Object.entries(langConfig)) {
        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            key in merged &&
            typeof merged[key] === 'object'
        ) {
            merged[key] = { ...merged[key], ...value };
        } else {
            merged[key] = value;
        }
    }
    return merged as unknown as LanguageConfig;
}

// ---------------------------------------------------------------------------
// Keyboard loading
// ---------------------------------------------------------------------------

export function loadKeyboard(lang: string): KeyboardConfig {
    const keyboardPath = join(DATA_DIR, 'languages', lang, `${lang}_keyboard.json`);
    const raw = readJsonFile<any>(keyboardPath);
    if (!raw) return { default: null, layouts: {} };

    // Legacy format: array of rows
    if (Array.isArray(raw)) {
        if (raw.length === 0) return { default: null, layouts: {} };
        return {
            default: 'default',
            layouts: { default: { label: 'Default', rows: raw } },
        };
    }

    if (typeof raw !== 'object') return { default: null, layouts: {} };

    const layoutsBlock = raw.layouts;
    const sourceLayouts: Record<string, any> =
        typeof layoutsBlock === 'object' && layoutsBlock !== null
            ? layoutsBlock
            : Object.fromEntries(
                  Object.entries(raw).filter(([k]) => k !== 'default'),
              );

    const normalizedLayouts: Record<string, KeyboardLayout> = {};
    for (const [name, value] of Object.entries(sourceLayouts)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const v = value as Record<string, any>;
            normalizedLayouts[name] = {
                label: (v.label as string) || name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                rows: (v.rows as string[][]) || [],
            };
        } else {
            normalizedLayouts[name] = {
                label: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                rows: value as string[][],
            };
        }
    }

    let defaultLayout = raw.default as string | undefined;
    if (!defaultLayout || !(defaultLayout in normalizedLayouts)) {
        defaultLayout = Object.keys(normalizedLayouts)[0];
    }

    return { default: defaultLayout || null, layouts: normalizedLayouts };
}

// ---------------------------------------------------------------------------
// Startup data cache
// ---------------------------------------------------------------------------

export interface LanguageData {
    languageCodes: string[];
    configs: Record<string, LanguageConfig>;
    wordLists: Record<string, string[]>;
    supplements: Record<string, string[]>;
    blocklists: Record<string, Set<string>>;
    dailyWords: Record<string, string[] | null>;
    curatedSchedules: Record<string, string[] | null>;
    characters: Record<string, string[]>;
    keyboards: Record<string, KeyboardConfig>;
    languages: Record<string, { language_name: string; language_name_native: string; language_code: string }>;
}

let _cachedData: LanguageData | null = null;

// ---------------------------------------------------------------------------
// Words JSON loading (from word pipeline)
// ---------------------------------------------------------------------------

interface WordEntry {
    word: string;
    length: number;
    tier: 'daily' | 'valid' | 'blocked';
    frequency?: number;
    sources?: string[];
    reviewed?: boolean;
    history?: number[];
}

interface WordsFile {
    metadata: { language_code: string; language_name: string; last_pipeline_run?: string };
    words: WordEntry[];
}

interface ParsedWords {
    daily: string[];
    valid: string[];
    blocked: string[];
}

function loadWordsJson(lang: string): ParsedWords | null {
    const wordsPath = join(DATA_DIR, 'languages', lang, 'words.json');
    const data = readJsonFile<WordsFile>(wordsPath);
    if (!data) return null;

    const daily: string[] = [];
    const valid: string[] = [];
    const blocked: string[] = [];
    for (const w of data.words) {
        if (w.tier === 'daily') daily.push(w.word);
        else if (w.tier === 'valid') valid.push(w.word);
        else if (w.tier === 'blocked') blocked.push(w.word);
    }
    return { daily, valid, blocked };
}

export function loadAllData(): LanguageData {
    if (_cachedData) return _cachedData;

    console.log('[data-loader] Loading data...');
    const langDir = join(DATA_DIR, 'languages');
    const languageCodes = readdirSync(langDir).filter((f) =>
        existsSync(join(langDir, f, 'words.json')) ||
        existsSync(join(langDir, f, `${f}_5words.txt`)),
    );

    const configs: Record<string, LanguageConfig> = {};
    const characters: Record<string, string[]> = {};
    for (const lc of languageCodes) {
        configs[lc] = loadLanguageConfig(lc);
    }

    const wordLists: Record<string, string[]> = {};
    const supplements: Record<string, string[]> = {};
    const blocklists: Record<string, Set<string>> = {};
    const dailyWords: Record<string, string[] | null> = {};
    const curatedSchedules: Record<string, string[] | null> = {};
    const keyboards: Record<string, KeyboardConfig> = {};
    let compiledCount = 0;

    for (const lc of languageCodes) {
        // Try words.json first (from word pipeline)
        const parsed = loadWordsJson(lc);
        if (parsed) {
            // Use parsed data: all tiers combined = word list
            wordLists[lc] = [...parsed.daily, ...parsed.valid, ...parsed.blocked];
            supplements[lc] = [];
            blocklists[lc] = new Set(parsed.blocked);
            dailyWords[lc] = parsed.daily.length > 0 ? parsed.daily : null;
            curatedSchedules[lc] = loadCuratedSchedule(lc); // may be null if file deleted
            keyboards[lc] = loadKeyboard(lc);
            compiledCount++;
        } else {
            // Fall back to raw text files
            wordLists[lc] = loadWords(lc, configs[lc]!);
            supplements[lc] = loadSupplementalWords(lc);
            blocklists[lc] = loadBlocklist(lc);
            dailyWords[lc] = loadDailyWords(lc);
            curatedSchedules[lc] = loadCuratedSchedule(lc);
            keyboards[lc] = loadKeyboard(lc);
        }
    }

    // Derive characters from word lists (or load from file if available)
    for (const lc of languageCodes) {
        const charPath = join(DATA_DIR, 'languages', lc, `${lc}_characters.txt`);
        if (existsSync(charPath)) {
            characters[lc] = readTextLines(charPath);
        } else {
            // Derive from word list
            const charSet = new Set<string>();
            for (const word of wordLists[lc] || []) {
                for (const char of word) {
                    charSet.add(char);
                }
            }
            characters[lc] = [...charSet].sort();
        }
    }

    // Build language name map
    const languages: Record<string, { language_name: string; language_name_native: string; language_code: string }> = {};
    for (const lc of languageCodes) {
        const config = configs[lc]!;
        languages[lc] = {
            language_name: config.name || lc,
            language_name_native: config.name_native || config.name || lc,
            language_code: lc,
        };
    }

    // Curated schedule safety check
    const todaysIdx = getTodaysIdx();
    const daysSinceMigration = todaysIdx - MIGRATION_DAY_IDX;
    for (const lc of languageCodes) {
        const schedule = curatedSchedules[lc];
        const scheduleLen = schedule ? schedule.length : 0;
        if (scheduleLen < daysSinceMigration && dailyWords[lc]) {
            console.warn(
                `[data-loader] WORD SAFETY: ${lc} curated_schedule has ${scheduleLen} entries ` +
                    `but ${daysSinceMigration} days since migration. ` +
                    `Run: uv run python scripts/freeze_past_words.py ${lc}`,
            );
        }
    }

    const stats = {
        totalLanguages: languageCodes.length,
        withSupplements: Object.values(supplements).filter((s) => s.length > 0).length,
        fromWordsJson: compiledCount,
    };
    console.log(
        `[data-loader] Loaded ${stats.totalLanguages} languages ` +
        `(${stats.withSupplements} with supplements, ${stats.fromWordsJson} from words.json)`,
    );

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
        languages,
    };
    return _cachedData;
}

// Import from day-index.ts (not word-selection.ts) to avoid circular dependency
import { getTodaysIdx } from '../lib/day-index';
