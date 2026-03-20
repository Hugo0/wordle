/**
 * Definition fetching.
 *
 * 3-tier system: disk cache → LLM (GPT-5.2) → kaikki (offline Wiktionary).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { WORD_DEFS_DIR } from './data-loader';

const NEGATIVE_CACHE_TTL = 24 * 3600; // 24 hours

// ---------------------------------------------------------------------------
// Kaikki pre-built definitions (offline verification / fallback)
// ---------------------------------------------------------------------------

function resolveDefinitionsDir(): string {
    const candidates = [
        resolve(process.cwd(), 'data', 'definitions'),
        resolve(process.cwd(), '..', 'data', 'definitions'),
    ];
    for (const c of candidates) {
        if (existsSync(c)) {
            console.log(`[DEFS] Definitions dir: ${c}`);
            return c;
        }
    }
    console.warn(`[DEFS] Definitions dir NOT FOUND, tried: ${candidates.join(', ')}`);
    return candidates[0]!;
}

const DEFINITIONS_DIR = resolveDefinitionsDir();
const _kaikkiCache: Record<string, Record<string, string>> = {};

function loadKaikkiFile(cacheKey: string, filePath: string): Record<string, string> {
    if (_kaikkiCache[cacheKey]) return _kaikkiCache[cacheKey]!;
    if (existsSync(filePath)) {
        try {
            _kaikkiCache[cacheKey] = JSON.parse(readFileSync(filePath, 'utf-8'));
            console.log(
                `[KAIKKI] Loaded ${cacheKey}: ${Object.keys(_kaikkiCache[cacheKey]!).length} entries`
            );
        } catch {
            _kaikkiCache[cacheKey] = {};
        }
    } else {
        console.warn(`[KAIKKI] File not found: ${filePath}`);
        _kaikkiCache[cacheKey] = {};
    }
    return _kaikkiCache[cacheKey]!;
}

function lookupKaikki(
    word: string,
    langCode: string,
    variant: 'native' | 'en'
): Record<string, any> | null {
    const cacheKey = variant === 'native' ? `${langCode}_native` : `${langCode}_en`;
    const fileName = variant === 'native' ? `${langCode}.json` : `${langCode}_en.json`;
    const source = variant === 'native' ? 'kaikki' : 'kaikki-en';

    const defs = loadKaikkiFile(cacheKey, join(DEFINITIONS_DIR, fileName));
    const definition = defs[word.toLowerCase()];
    if (definition) {
        return {
            definition,
            part_of_speech: null,
            source,
            url: wiktionaryUrl(word, langCode),
            ts: Math.floor(Date.now() / 1000),
        };
    }
    return null;
}

// ---------------------------------------------------------------------------
// Wiktionary URL construction
// ---------------------------------------------------------------------------

const WIKT_LANG_MAP: Record<string, string> = {
    nb: 'no',
    nn: 'no',
    hyw: 'hy',
    ckb: 'ku',
};

function wiktionaryUrl(word: string, langCode: string): string {
    const wiktLang = WIKT_LANG_MAP[langCode] || langCode;
    return `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

// ---------------------------------------------------------------------------
// LLM definition generation
// ---------------------------------------------------------------------------

const LLM_LANG_NAMES: Record<string, string> = {
    en: 'English',
    fi: 'Finnish',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    sv: 'Swedish',
    nb: 'Norwegian Bokmål',
    nn: 'Norwegian Nynorsk',
    da: 'Danish',
    pl: 'Polish',
    ru: 'Russian',
    uk: 'Ukrainian',
    bg: 'Bulgarian',
    hr: 'Croatian',
    sr: 'Serbian',
    sl: 'Slovenian',
    cs: 'Czech',
    sk: 'Slovak',
    ro: 'Romanian',
    hu: 'Hungarian',
    tr: 'Turkish',
    az: 'Azerbaijani',
    et: 'Estonian',
    lt: 'Lithuanian',
    lv: 'Latvian',
    el: 'Greek',
    ka: 'Georgian',
    hy: 'Armenian',
    he: 'Hebrew',
    ar: 'Arabic',
    fa: 'Persian',
    vi: 'Vietnamese',
    id: 'Indonesian',
    ms: 'Malay',
    ca: 'Catalan',
    gl: 'Galician',
    eu: 'Basque',
    br: 'Breton',
    oc: 'Occitan',
    la: 'Latin',
    ko: 'Korean',
    sq: 'Albanian',
    mk: 'Macedonian',
    is: 'Icelandic',
    ga: 'Irish',
    cy: 'Welsh',
    mt: 'Maltese',
    hyw: 'Western Armenian',
    ckb: 'Central Kurdish',
    pau: 'Palauan',
    ia: 'Interlingua',
    ie: 'Interlingue',
    rw: 'Kinyarwanda',
    tlh: 'Klingon',
    qya: 'Quenya',
    // Added: languages that were missing LLM definition support
    bn: 'Bengali',
    eo: 'Esperanto',
    fo: 'Faroese',
    fur: 'Friulian',
    fy: 'West Frisian',
    gd: 'Scottish Gaelic',
    ha: 'Hausa',
    hi: 'Hindi',
    ja: 'Japanese',
    lb: 'Luxembourgish',
    ltg: 'Latgalian',
    mi: 'Māori',
    mn: 'Mongolian',
    mr: 'Marathi',
    nds: 'Low German',
    ne: 'Nepali',
    pa: 'Punjabi',
    sw: 'Swahili',
    tk: 'Turkmen',
    tl: 'Tagalog',
    ur: 'Urdu',
    uz: 'Uzbek',
    yo: 'Yoruba',
};

const LLM_MODEL = 'gpt-5.2';

async function callLlmDefinition(
    word: string,
    langCode: string
): Promise<Record<string, any> | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const langName = LLM_LANG_NAMES[langCode];
    if (!langName) return null;

    const isEnglish = langCode === 'en';
    const nativeInstruction = isEnglish
        ? 'same as definition_en'
        : `a short definition in ${langName} (1 sentence, max 150 chars)`;

    const userPrompt =
        `Define the ${langName} word "${word}".\n\n` +
        `This is a common word from a daily word game. ` +
        `Give the MOST COMMON everyday meaning, not archaic or rare senses.\n\n` +
        `Return JSON:\n{\n` +
        `  "definition_native": "${nativeInstruction}",\n` +
        `  "definition_en": "a short definition in English (1 sentence, max 150 chars)",\n` +
        `  "part_of_speech": "noun/verb/adjective/adverb/other (lowercase English)",\n` +
        `  "confidence": 0.0-1.0\n}\n\n` +
        `If you don't recognize this word in ${langName}, ` +
        `return all fields as null with confidence 0.0.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a multilingual dictionary. Return valid JSON only.',
                    },
                    { role: 'user', content: userPrompt },
                ],
                max_completion_tokens: 200,
                temperature: 0,
                response_format: { type: 'json_object' },
            }),
            signal: AbortSignal.timeout(15000),
        });

        const data = await response.json();
        const text = data.choices[0].message.content.trim();
        const result = JSON.parse(text);

        const confidence = result.confidence || 0;
        const definitionEn = result.definition_en;
        const definitionNative = result.definition_native;

        if (!definitionEn || confidence < 0.3) {
            console.log(
                `[LLM LOW] ${langCode}/${word}: confidence=${confidence}, def_en=${definitionEn}`
            );
            return null;
        }

        const defEn = definitionEn.slice(0, 300);
        const defNative = (definitionNative || definitionEn).slice(0, 300);
        const wiktUrl = wiktionaryUrl(word, langCode);

        return {
            definition_native: defNative,
            definition_en: defEn,
            definition: defEn, // backward compat
            confidence,
            part_of_speech: result.part_of_speech,
            source: 'llm',
            url: wiktUrl,
            wiktionary_url: wiktUrl,
        };
    } catch (e: any) {
        console.warn(`[LLM ERROR] ${langCode}/${word}: ${e.message || e}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Fetch a word definition. 3-tier: disk cache → LLM → kaikki.
 */
export async function fetchDefinition(
    word: string,
    langCode: string,
    options: { skipNegativeCache?: boolean } = {}
): Promise<Record<string, any> | null> {
    const cacheDir = WORD_DEFS_DIR;
    const langCacheDir = join(cacheDir, langCode);
    const cachePath = join(langCacheDir, `${word.toLowerCase()}.json`);

    // --- Tier 1: Disk cache ---
    if (existsSync(cachePath)) {
        try {
            const loaded = JSON.parse(readFileSync(cachePath, 'utf-8'));
            if (loaded.not_found) {
                if (!options.skipNegativeCache) {
                    const cachedTs = loaded.ts || 0;
                    if (Date.now() / 1000 - cachedTs < NEGATIVE_CACHE_TTL) {
                        return null;
                    }
                }
                // Expired — fall through to LLM
            } else if (loaded && Object.keys(loaded).length > 0) {
                // If cached result is English-only (kaikki-en fallback), try LLM for native
                // But only retry once per 24h to avoid hammering LLM
                if (loaded.source === 'kaikki-en' && !loaded.definition_native) {
                    const cachedTs = loaded.ts || 0;
                    if (Date.now() / 1000 - cachedTs < NEGATIVE_CACHE_TTL) {
                        return loaded; // Too soon to retry, serve cached English
                    }
                    // Expired — fall through to LLM
                } else {
                    return loaded;
                }
            }
        } catch {
            // Fall through
        }
    }

    // --- Tier 2: LLM ---
    let result = await callLlmDefinition(word, langCode);

    // --- Tier 3: Kaikki fallback ---
    if (!result) {
        result = lookupKaikki(word, langCode, 'native') || lookupKaikki(word, langCode, 'en');
    }

    // Cache result (including negative results)
    try {
        mkdirSync(langCacheDir, { recursive: true });
        writeFileSync(
            cachePath,
            JSON.stringify(result || { not_found: true, ts: Math.floor(Date.now() / 1000) }),
            'utf-8'
        );
    } catch {
        // Non-critical
    }

    return result;
}
