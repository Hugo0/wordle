/**
 * GET /api/[lang]/word-image/[word] — AI-generated word illustration.
 *
 * Serves cached WebP images. Generates via DALL-E on demand for current daily words.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { loadAllData, WORD_IMAGES_DIR } from '../../../utils/data-loader';
import { getTodaysIdx, getWordForDay } from '../../../utils/word-selection';
import { fetchDefinition } from '../../../utils/definitions';

// Top 30 languages get DALL-E images (cost control)
const LANGUAGE_POPULARITY = [
    'fi',
    'en',
    'ar',
    'tr',
    'hr',
    'bg',
    'de',
    'he',
    'sv',
    'ru',
    'hu',
    'es',
    'et',
    'da',
    'sr',
    'ro',
    'ca',
    'sk',
    'it',
    'az',
    'fr',
    'lv',
    'la',
    'gl',
    'mk',
    'uk',
    'pt',
    'vi',
    'pl',
    'hy',
];
const IMAGE_LANGUAGES = new Set(LANGUAGE_POPULARITY);
const IMAGE_MIN_DAY_IDX = 1708;

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const word = getRouterParam(event, 'word')!.normalize('NFC');
    const data = loadAllData();

    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Not found' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        throw createError({ statusCode: 404, message: 'Not available' });
    }

    const cacheDir = join(WORD_IMAGES_DIR, lang);
    const cachePath = join(cacheDir, `${word.toLowerCase()}.webp`);

    // Serve cached image
    if (existsSync(cachePath)) {
        setResponseHeader(event, 'Content-Type', 'image/webp');
        setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000');
        return readFileSync(cachePath);
    }

    // For non-top languages, only serve from cache
    if (!IMAGE_LANGUAGES.has(lang)) {
        throw createError({ statusCode: 404, message: 'Image not available for this language' });
    }

    // Verify word is/was a daily word
    const tz = data.configs[lang]!.timezone || 'UTC';
    const todaysIdx = getTodaysIdx(tz);
    const query = getQuery(event);
    let dayIdx = query.day_idx ? parseInt(query.day_idx as string, 10) : todaysIdx;

    if (dayIdx < 1 || dayIdx > todaysIdx) {
        throw createError({ statusCode: 403, message: 'Invalid day index' });
    }

    const expectedWord = getWordForDay(lang, dayIdx);
    if (word.toLowerCase() !== expectedWord.toLowerCase()) {
        throw createError({ statusCode: 403, message: 'Not a valid daily word' });
    }

    // Only generate for recent words
    if (dayIdx < IMAGE_MIN_DAY_IDX) {
        throw createError({ statusCode: 404, message: 'Image not available for historical words' });
    }

    // Pending check
    const pendingPath = cachePath + '.pending';
    if (existsSync(pendingPath)) {
        setResponseStatus(event, 202);
        return 'Image being generated';
    }

    // Mark as pending
    try {
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(pendingPath, '', { flag: 'wx' });
    } catch {
        setResponseStatus(event, 202);
        return 'Image being generated';
    }

    try {
        // Get definition hint for DALL-E prompt
        let definitionHint = '';
        const defn = await fetchDefinition(word, lang);
        if (defn) {
            const enDef = defn.definition_en || defn.definition || '';
            if (enDef) definitionHint = `, which means ${enDef}`;
        }

        const prompt =
            `A painterly illustration representing the concept of ` +
            `${word}${definitionHint}. ` +
            `No text, no letters, no words, no UI elements.`;

        // Generate via DALL-E
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.images.generate({
            model: 'dall-e-3',
            prompt,
            size: '1024x1024',
            quality: 'standard',
            n: 1,
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl?.startsWith('https://')) {
            throw createError({ statusCode: 404, message: 'Image generation failed' });
        }

        // Download and convert to WebP
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const sharp = (await import('sharp')).default;
        const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();

        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(cachePath, webpBuffer);

        setResponseHeader(event, 'Content-Type', 'image/webp');
        setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000');
        return webpBuffer;
    } catch (e: any) {
        console.error(`[word-image] Failed for ${lang}/${word}: ${e.message}`);
        throw createError({ statusCode: 404, message: 'Image generation failed' });
    } finally {
        if (existsSync(pendingPath)) {
            try {
                unlinkSync(pendingPath);
            } catch {}
        }
    }
});
