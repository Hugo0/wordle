/**
 * Semantic Explorer — submit a guess.
 *
 * Rank lookup via precomputed target_neighbors table (pgvector).
 * Embeddings, coordinates, and neighbors all live in Postgres.
 * Only axes (140KB) and valid words (2MB) are in memory.
 */

import {
    cosineSimilarity,
    getSessionTarget,
    rankToDisplay,
    computeCompass,
} from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/_semantic-db';
import { getValidWords } from '~/server/plugins/semantic-warmup';

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang') ?? 'en';
    const body = await readBody(event);
    const targetId = body?.targetId as string | undefined;
    const word = (body?.word as string | undefined)?.toLowerCase().trim();
    const guessNumber = Number(body?.guessNumber ?? 1);

    if (!targetId || !word) {
        throw createError({ statusCode: 400, message: 'Missing targetId or word' });
    }

    const target = getSessionTarget(targetId);
    if (!target) {
        throw createError({ statusCode: 404, message: 'Unknown or expired targetId' });
    }

    const targetVec = await semanticDb.getEmbedding(lang, target);
    if (!targetVec) {
        throw createError({ statusCode: 500, message: 'Target embedding missing' });
    }

    let guessVec = await semanticDb.getEmbedding(lang, word);
    if (!guessVec) {
        if (!/^[a-z][a-z\-']{0,24}$/.test(word)) {
            return { valid: false, word, reason: 'bad_format' };
        }
        const validWords = getValidWords();
        if (validWords.size > 0 && !validWords.has(word)) {
            return { valid: false, word, reason: 'not_a_word' };
        }
        guessVec = await semanticDb.fetchOnDemandEmbedding(lang, word);
        if (!guessVec) {
            return { valid: false, word, reason: 'embedding_failed' };
        }
    }

    const rawSimilarity = cosineSimilarity(guessVec, targetVec);

    const [rankResult, totalRanked, umapPosition] = await Promise.all([
        semanticDb.computeGuessRank(lang, target, word, guessVec, targetVec),
        semanticDb.getTotalRanked(lang),
        semanticDb.get2dPosition(lang, word),
    ]);
    const rank = rankResult ?? totalRanked;
    const won = rank === 1;
    const display = won ? 1 : Math.min(0.99, rankToDisplay(rank, totalRanked));

    const allProjectionsNormalized = semanticDb.projectAxes(guessVec);

    let compassResult = { hints: [] as any[], status: 'close' as const, totalExplained: 0 };
    const cachedAxes = semanticDb.getCachedAxes();
    if (cachedAxes) {
        try {
            compassResult = computeCompass(cachedAxes, guessVec, targetVec, 5, []);
        } catch {
            /* skip */
        }
    }

    const response: Record<string, unknown> = {
        valid: true,
        word,
        rank,
        totalRanked,
        display,
        similarity: rawSimilarity,
        umapPosition,
        allProjectionsNormalized,
        compass: compassResult.hints,
        compassStatus: compassResult.status,
        compassExplained: compassResult.totalExplained,
        won,
        guessNumber,
    };
    if (won) response.targetWord = target;
    return response;
});
