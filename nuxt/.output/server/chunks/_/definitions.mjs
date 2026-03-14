import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { a as WORD_DEFS_DIR } from './data-loader.mjs';

const NEGATIVE_CACHE_TTL = 24 * 3600;
function resolveDefinitionsDir() {
  const candidates = [
    resolve(process.cwd(), "..", "webapp", "data", "definitions"),
    resolve(process.cwd(), "webapp", "data", "definitions")
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}
const DEFINITIONS_DIR = resolveDefinitionsDir();
const _kaikkiCache = {};
function loadKaikkiFile(cacheKey, filePath) {
  if (_kaikkiCache[cacheKey]) return _kaikkiCache[cacheKey];
  if (existsSync(filePath)) {
    try {
      _kaikkiCache[cacheKey] = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      _kaikkiCache[cacheKey] = {};
    }
  } else {
    _kaikkiCache[cacheKey] = {};
  }
  return _kaikkiCache[cacheKey];
}
function lookupKaikki(word, langCode, variant) {
  const cacheKey = variant === "native" ? `${langCode}_native` : `${langCode}_en`;
  const fileName = variant === "native" ? `${langCode}.json` : `${langCode}_en.json`;
  const source = variant === "native" ? "kaikki" : "kaikki-en";
  const defs = loadKaikkiFile(cacheKey, join(DEFINITIONS_DIR, fileName));
  const definition = defs[word.toLowerCase()];
  if (definition) {
    return {
      definition,
      part_of_speech: null,
      source,
      url: wiktionaryUrl(word, langCode)
    };
  }
  return null;
}
const WIKT_LANG_MAP = {
  nb: "no",
  nn: "no",
  hyw: "hy",
  ckb: "ku"
};
function wiktionaryUrl(word, langCode) {
  const wiktLang = WIKT_LANG_MAP[langCode] || langCode;
  return `https://${wiktLang}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}
const LLM_LANG_NAMES = {
  en: "English",
  fi: "Finnish",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  sv: "Swedish",
  nb: "Norwegian Bokm\xE5l",
  nn: "Norwegian Nynorsk",
  da: "Danish",
  pl: "Polish",
  ru: "Russian",
  uk: "Ukrainian",
  bg: "Bulgarian",
  hr: "Croatian",
  sr: "Serbian",
  sl: "Slovenian",
  cs: "Czech",
  sk: "Slovak",
  ro: "Romanian",
  hu: "Hungarian",
  tr: "Turkish",
  az: "Azerbaijani",
  et: "Estonian",
  lt: "Lithuanian",
  lv: "Latvian",
  el: "Greek",
  ka: "Georgian",
  hy: "Armenian",
  he: "Hebrew",
  ar: "Arabic",
  fa: "Persian",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ca: "Catalan",
  gl: "Galician",
  eu: "Basque",
  br: "Breton",
  oc: "Occitan",
  la: "Latin",
  ko: "Korean",
  sq: "Albanian",
  mk: "Macedonian",
  is: "Icelandic",
  ga: "Irish",
  cy: "Welsh",
  mt: "Maltese",
  hyw: "Western Armenian",
  ckb: "Central Kurdish",
  pau: "Palauan",
  ie: "Interlingue",
  rw: "Kinyarwanda",
  tlh: "Klingon",
  qya: "Quenya"
};
const LLM_MODEL = "gpt-5.2";
async function callLlmDefinition(word, langCode) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const langName = LLM_LANG_NAMES[langCode];
  if (!langName) return null;
  const isEnglish = langCode === "en";
  const nativeInstruction = isEnglish ? "same as definition_en" : `a short definition in ${langName} (1 sentence, max 150 chars)`;
  const userPrompt = `Define the ${langName} word "${word}".

This is a common word from a daily word game. Give the MOST COMMON everyday meaning, not archaic or rare senses.

Return JSON:
{
  "definition_native": "${nativeInstruction}",
  "definition_en": "a short definition in English (1 sentence, max 150 chars)",
  "part_of_speech": "noun/verb/adjective/adverb/other (lowercase English)",
  "confidence": 0.0-1.0
}

If you don't recognize this word in ${langName}, return all fields as null with confidence 0.0.`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a multilingual dictionary. Return valid JSON only."
          },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: 200,
        temperature: 0,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(15e3)
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
      definition: defEn,
      // backward compat
      confidence,
      part_of_speech: result.part_of_speech,
      source: "llm",
      url: wiktUrl,
      wiktionary_url: wiktUrl
    };
  } catch (e) {
    console.warn(`[LLM ERROR] ${langCode}/${word}: ${e.message || e}`);
    return null;
  }
}
async function fetchDefinition(word, langCode, options = {}) {
  const cacheDir = WORD_DEFS_DIR;
  const langCacheDir = join(cacheDir, langCode);
  const cachePath = join(langCacheDir, `${word.toLowerCase()}.json`);
  if (existsSync(cachePath)) {
    try {
      const loaded = JSON.parse(readFileSync(cachePath, "utf-8"));
      if (loaded.not_found) {
        if (!options.skipNegativeCache) {
          const cachedTs = loaded.ts || 0;
          if (Date.now() / 1e3 - cachedTs < NEGATIVE_CACHE_TTL) {
            return null;
          }
        }
      } else if (loaded && Object.keys(loaded).length > 0) {
        return loaded;
      }
    } catch {
    }
  }
  let result = await callLlmDefinition(word, langCode);
  if (!result) {
    result = lookupKaikki(word, langCode, "native") || lookupKaikki(word, langCode, "en");
  }
  try {
    mkdirSync(langCacheDir, { recursive: true });
    writeFileSync(
      cachePath,
      JSON.stringify(
        result || { not_found: true, ts: Math.floor(Date.now() / 1e3) }
      ),
      "utf-8"
    );
  } catch {
  }
  return result;
}

export { fetchDefinition as f };
//# sourceMappingURL=definitions.mjs.map
