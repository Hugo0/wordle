import { d as defineEventHandler, g as getRouterParam, c as createError, s as setResponseHeader, a as getQuery, b as setResponseStatus } from '../../../../nitro/nitro.mjs';
import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { l as loadAllData, W as WORD_IMAGES_DIR } from '../../../../_/data-loader.mjs';
import { g as getTodaysIdx, a as getWordForDay } from '../../../../_/word-selection.mjs';
import { f as fetchDefinition } from '../../../../_/definitions.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'crypto';

const LANGUAGE_POPULARITY = [
  "fi",
  "en",
  "ar",
  "tr",
  "hr",
  "bg",
  "de",
  "he",
  "sv",
  "ru",
  "hu",
  "es",
  "et",
  "da",
  "sr",
  "ro",
  "ca",
  "sk",
  "it",
  "az",
  "fr",
  "lv",
  "la",
  "gl",
  "mk",
  "uk",
  "pt",
  "vi",
  "pl",
  "hy"
];
const IMAGE_LANGUAGES = new Set(LANGUAGE_POPULARITY);
const IMAGE_MIN_DAY_IDX = 1708;
const _word__get = defineEventHandler(async (event) => {
  var _a;
  const lang = getRouterParam(event, "lang");
  const word = getRouterParam(event, "word");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Not found" });
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw createError({ statusCode: 404, message: "Not available" });
  }
  const cacheDir = join(WORD_IMAGES_DIR, lang);
  const cachePath = join(cacheDir, `${word.toLowerCase()}.webp`);
  if (existsSync(cachePath)) {
    setResponseHeader(event, "Content-Type", "image/webp");
    setResponseHeader(event, "Cache-Control", "public, max-age=31536000");
    return readFileSync(cachePath);
  }
  if (!IMAGE_LANGUAGES.has(lang)) {
    throw createError({ statusCode: 404, message: "Image not available for this language" });
  }
  const tz = data.configs[lang].timezone || "UTC";
  const todaysIdx = getTodaysIdx(tz);
  const query = getQuery(event);
  let dayIdx = query.day_idx ? parseInt(query.day_idx, 10) : todaysIdx;
  if (dayIdx < 1 || dayIdx > todaysIdx) {
    throw createError({ statusCode: 403, message: "Invalid day index" });
  }
  const expectedWord = getWordForDay(lang, dayIdx);
  if (word.toLowerCase() !== expectedWord.toLowerCase()) {
    throw createError({ statusCode: 403, message: "Not a valid daily word" });
  }
  if (dayIdx < IMAGE_MIN_DAY_IDX) {
    throw createError({ statusCode: 404, message: "Image not available for historical words" });
  }
  const pendingPath = cachePath + ".pending";
  if (existsSync(pendingPath)) {
    setResponseStatus(event, 202);
    return "Image being generated";
  }
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(pendingPath, "", { flag: "wx" });
  } catch {
    setResponseStatus(event, 202);
    return "Image being generated";
  }
  try {
    let definitionHint = "";
    const defn = await fetchDefinition(word, lang);
    if (defn) {
      const enDef = defn.definition_en || defn.definition || "";
      if (enDef) definitionHint = `, which means ${enDef}`;
    }
    const prompt = `A painterly illustration representing the concept of ${word}${definitionHint}. No text, no letters, no words, no UI elements.`;
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: openaiKey });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1
    });
    const imageUrl = (_a = response.data[0]) == null ? void 0 : _a.url;
    if (!(imageUrl == null ? void 0 : imageUrl.startsWith("https://"))) {
      throw createError({ statusCode: 404, message: "Image generation failed" });
    }
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(3e4) });
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const sharp = (await import('sharp')).default;
    const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cachePath, webpBuffer);
    setResponseHeader(event, "Content-Type", "image/webp");
    setResponseHeader(event, "Cache-Control", "public, max-age=31536000");
    return webpBuffer;
  } catch (e) {
    console.error(`[word-image] Failed for ${lang}/${word}: ${e.message}`);
    throw createError({ statusCode: 404, message: "Image generation failed" });
  } finally {
    if (existsSync(pendingPath)) {
      try {
        unlinkSync(pendingPath);
      } catch {
      }
    }
  }
});

export { _word__get as default };
//# sourceMappingURL=_word_.get.mjs.map
