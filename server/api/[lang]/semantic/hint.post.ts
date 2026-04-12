// LLM hint endpoint. Returns one short cryptic directional hint.
// Cache-keyed on target word only — same hint for all players on the same daily.
// Includes a validator loop: if the hint is too easy to reverse, regenerate.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { dedup } from '~/server/utils/inflight';
import { getSessionTarget } from '~/server/utils/semantic';

const LLM_MODEL = 'gpt-5.2';
const CACHE_DIR = join(process.cwd(), 'word-defs', 'semantic-hints');
const MAX_ATTEMPTS = 3;

async function callLlm(
    messages: { role: string; content: string }[],
    maxTokens = 120,
    temperature = 0.9
): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages,
                max_completion_tokens: maxTokens,
                temperature,
                response_format: { type: 'json_object' },
            }),
            signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (e) {
        console.warn('[semantic hint] LLM error', e);
        return null;
    }
}

async function generateHint(target: string): Promise<string | null> {
    const prompt =
        `You are writing a single cryptic hint for a word-guessing game. The player ` +
        `is hunting a hidden target word by meaning, not letters. They get ONE hint ` +
        `per game, so make it count — but keep it mysterious.\n\n` +
        `Target word: "${target}"\n\n` +
        `Rules:\n` +
        `- Write ONE hint, under 12 words\n` +
        `- Poetic, evocative, oblique — NOT a description or definition\n` +
        `- Think riddle, koan, or haiku fragment\n` +
        `- Describe a FEELING, SITUATION, or MOMENT — never the object itself\n` +
        `- Do NOT describe what it looks like, what it does, where you find it, or what it's made of\n` +
        `- NEVER use the target word, any direct synonym, hypernym, or rhyming word\n` +
        `- NEVER mention letters, length, or spelling\n` +
        `- Don't start with "It" or "Something"\n\n` +
        `Good examples of tone:\n` +
        `- For "candle": "what waits by the window when the power fails"\n` +
        `- For "memory": "the river you can only step in once"\n` +
        `- For "bicycle": "two circles that carried you home"\n\n` +
        `Return JSON: {"hint": "your cryptic hint"}`;

    const text = await callLlm([
        {
            role: 'system',
            content:
                'You are a cryptic poet writing oblique hints for a word-meaning game. ' +
                'Your hints are riddles, not descriptions. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
    ]);

    if (!text) return null;
    try {
        const parsed = JSON.parse(text);
        const hint = parsed.hint as string | undefined;
        if (!hint || hint.length > 200) return null;
        return hint;
    } catch {
        return null;
    }
}

/** Ask a second LLM call to guess the word from the hint. If it gets it right, the hint is too easy. */
async function validateHint(hint: string, target: string): Promise<boolean> {
    const text = await callLlm(
        [
            {
                role: 'system',
                content:
                    'You are playing a word-guessing game. Given a cryptic hint, guess the single English word it refers to. Return JSON: {"guesses": ["word1", "word2", "word3"]}',
            },
            {
                role: 'user',
                content: `Cryptic hint: "${hint}"\n\nWhat single English word is this hint about? Give your top 3 guesses.`,
            },
        ],
        80,
        0.3
    );

    if (!text) return true; // can't validate → accept

    try {
        const parsed = JSON.parse(text);
        const guesses = (parsed.guesses as string[]) ?? [];
        const normalized = guesses.map((g) => g.toLowerCase().trim());
        const tooEasy = normalized.includes(target.toLowerCase());
        return !tooEasy;
    } catch {
        return true; // parse error → accept
    }
}

async function generateValidatedHint(target: string): Promise<string | null> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const hint = await generateHint(target);
        if (!hint) continue;

        const ok = await validateHint(hint, target);
        if (ok) return hint;
        // Too easy — retry with fresh generation (temperature 0.9 gives variety)
    }
    // All attempts too easy or failed — return the last one anyway
    // (a slightly-too-easy hint is better than no hint)
    return generateHint(target);
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const targetId = body?.targetId as string | undefined;

    if (!targetId) {
        throw createError({ statusCode: 400, message: 'Missing targetId' });
    }
    const target = getSessionTarget(targetId);
    if (!target) {
        throw createError({ statusCode: 404, message: 'Unknown or expired targetId' });
    }

    const lang = getRouterParam(event, 'lang') ?? 'en';

    // Tier 0: DB cache
    try {
        const { getSemanticHint, setSemanticHint } = await import('~/server/utils/db-cache');
        const dbHint = await getSemanticHint(lang, target);
        if (dbHint) return { hint: dbHint, cached: true };
    } catch {
        /* fall through */
    }

    // Tier 1: Disk cache (fallback during migration)
    mkdirSync(CACHE_DIR, { recursive: true });
    const cacheFile = join(CACHE_DIR, `${target}.json`);
    if (existsSync(cacheFile)) {
        try {
            const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'));
            if (cached.hint) {
                return { hint: cached.hint, cached: true };
            }
        } catch {
            /* fall through */
        }
    }

    // Tier 2: Generate via LLM (deduplicated — only one generation per word)
    const result = await dedup('hint', `${lang}:${target}`, async () => {
        const generated = await generateValidatedHint(target);
        if (!generated) return null;

        // Cache to DB (primary) and disk (backup)
        try {
            const { setSemanticHint } = await import('~/server/utils/db-cache');
            setSemanticHint(lang, target, generated, LLM_MODEL);
        } catch {
            /* non-fatal */
        }
        writeFileSync(cacheFile, JSON.stringify({ hint: generated, createdAt: Date.now() }));

        return generated;
    });

    if (!result) {
        return { hint: null, cached: false, error: 'llm_unavailable' };
    }
    return { hint: result, cached: false };
});
