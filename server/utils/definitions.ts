import { consola } from 'consola';
/**
 * Definition fetching.
 *
 * 2-tier system: DB cache → LLM (GPT-5.2).
 * Kaikki (offline Wiktionary) definitions are pre-seeded in the DB with
 * source='kaikki' or 'kaikki-en', so they're found at the DB tier.
 */

import { dedup } from './inflight';
import { getWiktLang } from './word-selection';

const NEGATIVE_CACHE_TTL = 24 * 3600; // 24 hours

// ---------------------------------------------------------------------------
// Wiktionary URL construction
// ---------------------------------------------------------------------------

function wiktionaryUrl(word: string, langCode: string): string {
    return `https://${getWiktLang(langCode)}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
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
            consola.info(
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
        consola.warn(`[LLM ERROR] ${langCode}/${word}: ${e.message || e}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Fetch a word definition.
 *
 * 2-tier: DB cache → LLM. Kaikki definitions are pre-seeded in the DB.
 * With cacheOnly: DB only (no LLM call — safe for unlimited/random words).
 */
export async function fetchDefinition(
    word: string,
    langCode: string,
    options: { skipNegativeCache?: boolean; cacheOnly?: boolean } = {}
): Promise<Record<string, any> | null> {
    let dbCache: typeof import('./db-cache') | null = null;
    try {
        dbCache = await import('./db-cache');
    } catch {
        /* DB unavailable */
    }

    // --- DB cache (includes LLM, kaikki, and kaikki-en definitions) ---
    const dbResult = dbCache ? await dbCache.getDefinition(langCode, word.toLowerCase()) : null;
    if (dbResult) {
        if (dbResult.isNegative && !options.skipNegativeCache) return null;
        if (!dbResult.isNegative) {
            // kaikki-en fallback entries expire after 24h so LLM can retry
            const isStaleKaikkiEn =
                dbResult.source === 'kaikki-en' &&
                !dbResult.definitionNative &&
                Date.now() - dbResult.cachedAt.getTime() >= NEGATIVE_CACHE_TTL * 1000;
            if (!isStaleKaikkiEn) {
                return {
                    definition: dbResult.definition,
                    definition_native: dbResult.definitionNative,
                    definition_en: dbResult.definitionEn,
                    part_of_speech: dbResult.partOfSpeech,
                    confidence: dbResult.confidence,
                    source: dbResult.source,
                    url: dbResult.url,
                };
            }
        }
    }

    // cacheOnly mode: no LLM call (for hover-prefetch, unlimited words)
    if (options.cacheOnly) return null;

    // --- LLM generation, deduplicated across concurrent requests ---
    const dedupKey = `${langCode}:${word.toLowerCase()}`;
    const result = await dedup('definition', dedupKey, async () => {
        const llmResult = await callLlmDefinition(word, langCode);

        // Cache result to DB
        const isNeg = !llmResult;
        try {
            await dbCache?.upsertDefinition(
                langCode,
                word.toLowerCase(),
                llmResult
                    ? {
                          definition: llmResult.definition,
                          definitionNative: llmResult.definition_native,
                          definitionEn: llmResult.definition_en,
                          partOfSpeech: llmResult.part_of_speech,
                          confidence: llmResult.confidence,
                          source: llmResult.source,
                          model: LLM_MODEL,
                          url: llmResult.url,
                      }
                    : {},
                isNeg
            );
        } catch (e) {
            consola.warn(`[definitions] DB write failed for ${langCode}/${word}:`, e);
        }

        return llmResult;
    });

    return result;
}
