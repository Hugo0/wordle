import { consola } from 'consola';
/**
 * Data loading utilities.
 *
 * Loads word data, configs, and keyboards from data/languages/{lang}/words.json
 * at startup. All data is cached in memory.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import type { LanguageConfig, KeyboardConfig, KeyboardLayout } from '~/utils/types';

// ---------------------------------------------------------------------------
// Resolve data directory
// ---------------------------------------------------------------------------

function resolveDataDir(): string {
    // Try env var first (production)
    const envDataDir = process.env.NUXT_DATA_DIR;
    if (envDataDir && existsSync(envDataDir)) return envDataDir;

    // Development: resolve relative to process cwd
    const candidates = [resolve(process.cwd(), 'data'), resolve(process.cwd(), '..', 'data')];
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot find data/ directory. Tried: ${candidates.join(', ')}`);
}

const DATA_DIR = resolveDataDir();

// Persistent data directory for runtime-generated files (project root)
const PERSISTENT_DIR = process.env.DATA_DIR || resolve(DATA_DIR, '..');
export const WORD_IMAGES_DIR = join(PERSISTENT_DIR, 'word-images');
export const WORD_DEFS_DIR = join(PERSISTENT_DIR, 'word-defs');
export const WORD_STATS_DIR = join(PERSISTENT_DIR, 'word-stats');
export const WORD_HISTORY_DIR = join(PERSISTENT_DIR, 'word-history');

// Semantic Explorer has a two-tier layout:
//   - SEMANTIC_STATIC_DIR: small committed artifacts (vocab, targets,
//     axes, umap, valid_words). Lives in repo for deterministic builds.
//   - SEMANTIC_RUNTIME_DIR: heavy derivable files (embeddings.json,
//     percentiles.json) generated on first boot and cached on the
//     persistent disk. Survives deploys; regenerated if deleted.
export const SEMANTIC_STATIC_DIR = join(DATA_DIR, 'semantic');
export const SEMANTIC_RUNTIME_DIR = join(PERSISTENT_DIR, 'semantic-runtime');

// Migration cutoff: days before this use legacy shuffle, days after use consistent hashing
export const MIGRATION_DAY_IDX = 1681;

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

function readJsonFile<T>(filePath: string): T | null {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

// ---------------------------------------------------------------------------
// Language config loading
// ---------------------------------------------------------------------------

let _defaultConfig: Record<string, any> | null = null;

export function loadLanguageConfig(lang: string): LanguageConfig {
    if (!_defaultConfig) {
        _defaultConfig = readJsonFile<Record<string, any>>(
            join(DATA_DIR, 'default_language_config.json')
        )!;
    }
    const defaultConfig = _defaultConfig;

    const langConfigPath = join(DATA_DIR, 'languages', lang, 'language_config.json');
    const langConfig = readJsonFile<Record<string, any>>(langConfigPath);

    if (!langConfig) return defaultConfig as unknown as LanguageConfig;

    // Deep merge (2 levels): language-specific values override defaults.
    // Level 1: top-level sections (meta, text, help, ui, seo).
    // Level 2: nested objects within sections (seo.mode_faq, seo.mode_howto, etc.).
    // Arrays are always replaced wholesale (faq, tips, value_props).
    const merged: Record<string, any> = { ...defaultConfig };
    for (const [key, value] of Object.entries(langConfig)) {
        if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            key in merged &&
            typeof merged[key] === 'object'
        ) {
            const mergedSection: Record<string, any> = { ...merged[key] };
            for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
                if (
                    typeof subValue === 'object' &&
                    subValue !== null &&
                    !Array.isArray(subValue) &&
                    subKey in mergedSection &&
                    typeof mergedSection[subKey] === 'object' &&
                    !Array.isArray(mergedSection[subKey])
                ) {
                    // Level 2 merge (e.g. seo.mode_faq, seo.mode_howto)
                    mergedSection[subKey] = { ...mergedSection[subKey], ...subValue };
                } else {
                    mergedSection[subKey] = subValue;
                }
            }
            merged[key] = mergedSection;
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
            : Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'default'));

    const normalizedLayouts: Record<string, KeyboardLayout> = {};
    for (const [name, value] of Object.entries(sourceLayouts)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const v = value as Record<string, any>;
            normalizedLayouts[name] = {
                label:
                    (v.label as string) ||
                    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
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
// Words JSON loading (sole source of truth)
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
    metadata: { language_code: string; language_name?: string; last_pipeline_run?: string };
    words: WordEntry[];
}

interface ParsedWords {
    /** All words (daily + valid), used for guess validation */
    wordList: string[];
    /** Daily-tier words only, used for word selection */
    dailyWords: string[];
    /** Blocked words */
    blocked: Set<string>;
    /** History: day_idx → word (from history arrays in words.json) */
    wordHistory: Map<number, string>;
    /** All unique characters across all words */
    characters: string[];
}

function loadWordsJson(lang: string): ParsedWords | null {
    const wordsPath = join(DATA_DIR, 'languages', lang, 'words.json');
    const data = readJsonFile<WordsFile>(wordsPath);
    if (!data) return null;

    const wordList: string[] = [];
    const dailyWords: string[] = [];
    const blocked = new Set<string>();
    const wordHistory = new Map<number, string>();
    const charSet = new Set<string>();

    for (const w of data.words) {
        // Only include 5-letter words in the game lists
        const wordLen = w.length ?? w.word.length;
        if (wordLen !== 5) continue;

        if (w.tier === 'blocked') {
            blocked.add(w.word);
        } else {
            wordList.push(w.word);
            if (w.tier === 'daily') dailyWords.push(w.word);
        }

        // Build character set
        for (const ch of w.word) {
            charSet.add(ch);
        }

        // Build history map (day_idx → word)
        if (w.history) {
            for (const dayIdx of w.history) {
                wordHistory.set(dayIdx, w.word);
            }
        }
    }

    return {
        wordList,
        dailyWords,
        blocked,
        wordHistory,
        characters: [...charSet].sort(),
    };
}

// ---------------------------------------------------------------------------
// Startup data cache
// ---------------------------------------------------------------------------

export interface LanguageData {
    languageCodes: string[];
    configs: Record<string, LanguageConfig>;
    wordLists: Record<string, string[]>;
    blocklists: Record<string, Set<string>>;
    dailyWords: Record<string, string[]>;
    /** History from words.json: day_idx → word for each language */
    wordHistory: Record<string, Map<number, string>>;
    characters: Record<string, string[]>;
    keyboards: Record<string, KeyboardConfig>;
    languages: Record<
        string,
        { language_name: string; language_name_native: string; language_code: string }
    >;
}

let _cachedData: LanguageData | null = null;

export function loadAllData(): LanguageData {
    if (_cachedData) return _cachedData;

    consola.info('[data-loader] Loading data...');
    const langDir = join(DATA_DIR, 'languages');
    const languageCodes = readdirSync(langDir).filter((f) =>
        existsSync(join(langDir, f, 'words.json'))
    );

    const configs: Record<string, LanguageConfig> = {};
    for (const lc of languageCodes) {
        configs[lc] = loadLanguageConfig(lc);
    }

    const wordLists: Record<string, string[]> = {};
    const blocklists: Record<string, Set<string>> = {};
    const dailyWords: Record<string, string[]> = {};
    const wordHistory: Record<string, Map<number, string>> = {};
    const characters: Record<string, string[]> = {};
    const keyboards: Record<string, KeyboardConfig> = {};

    for (const lc of languageCodes) {
        const parsed = loadWordsJson(lc);
        if (!parsed) {
            consola.warn(`[data-loader] ${lc}: words.json exists but failed to parse`);
            continue;
        }
        wordLists[lc] = parsed.wordList;
        blocklists[lc] = parsed.blocked;
        dailyWords[lc] = parsed.dailyWords;
        wordHistory[lc] = parsed.wordHistory;
        characters[lc] = parsed.characters;
        keyboards[lc] = loadKeyboard(lc);
    }

    // Build language name map
    const languages: Record<
        string,
        { language_name: string; language_name_native: string; language_code: string }
    > = {};
    for (const lc of languageCodes) {
        const config = configs[lc]!;
        languages[lc] = {
            language_name: config.name || lc,
            language_name_native: config.name_native || config.name || lc,
            language_code: lc,
        };
    }

    const stats = {
        totalLanguages: languageCodes.length,
        totalWords: Object.values(wordLists).reduce((sum, wl) => sum + wl.length, 0),
    };
    consola.info(
        `[data-loader] Loaded ${stats.totalLanguages} languages (${stats.totalWords} total words)`
    );

    _cachedData = {
        languageCodes,
        configs,
        wordLists,
        blocklists,
        dailyWords,
        wordHistory,
        characters,
        keyboards,
        languages,
    };
    return _cachedData;
}

// Import from day-index.ts (not word-selection.ts) to avoid circular dependency
import { getTodaysIdx } from '../lib/day-index';

// ---------------------------------------------------------------------------
// Shared API helpers — DRY lang validation + response fields
// ---------------------------------------------------------------------------

/**
 * Validate lang param and return { lang, data, config }. Throws 404 if unknown.
 */
export function requireLang(event: { context: Record<string, any> }) {
    const lang = getRouterParam(event as any, 'lang')!;
    const data = loadAllData();
    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: `Unknown language: ${lang}` });
    }
    return { lang, data, config: data.configs[lang]! };
}

/**
 * Common response fields every [lang] endpoint should return.
 */
export function langResponseFields(lang: string, config: LanguageConfig) {
    return {
        lang_code: lang,
        lang_name: config.name || lang,
        lang_name_native: config.name_native || config.name || lang,
        ui: config.ui || {},
        meta: config.meta || {},
    };
}
