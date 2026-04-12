/**
 * Semantic Explorer — submit a guess.
 *
 * Rank lookup via precomputed target_neighbors table (pgvector).
 * Embeddings, coordinates, and neighbors all live in Postgres.
 * Only axes (140KB) and valid words (2MB) are in memory.
 */

import { cosineSimilarity, getSessionTarget, rankToDisplay } from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/semantic-db';
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

    // Fetch target embedding
    const targetVec = await semanticDb.getEmbedding(lang, target);
    if (!targetVec) {
        throw createError({ statusCode: 500, message: 'Target embedding missing' });
    }

    // Fetch guess embedding (DB first, on-demand OpenAI fallback)
    let guessVec = await semanticDb.getEmbedding(lang, word);
    if (!guessVec) {
        if (!/^[a-z][a-z\-']{0,24}$/.test(word)) {
            return { valid: false, word, reason: 'bad_format' };
        }
        // Spellcheck via in-memory valid words set (2MB, loaded at startup)
        const validWords = getValidWords();
        if (validWords.size > 0 && !validWords.has(word)) {
            return { valid: false, word, reason: 'not_a_word' };
        }
        // On-demand embedding via OpenAI
        const { fetchEmbeddingOnDemand, loadSemanticDataSafe } =
            await import('~/server/utils/semantic');
        guessVec = await fetchEmbeddingOnDemand(loadSemanticDataSafe(), word);
        if (!guessVec) {
            return { valid: false, word, reason: 'embedding_failed' };
        }
        semanticDb.storeOnDemandEmbedding(lang, word, guessVec);
    }

    const rawSimilarity = cosineSimilarity(guessVec, targetVec);

    // Parallelize independent DB queries
    const [rankResult, totalRanked, umapPosition] = await Promise.all([
        semanticDb.computeGuessRank(lang, target, word, guessVec),
        semanticDb.getTotalRanked(lang),
        semanticDb.get2dPosition(lang, word),
    ]);
    const rank = rankResult ?? 50001;
    const won = rank === 1;
    const display = won ? 1 : Math.min(0.99, rankToDisplay(rank, totalRanked));

    // Axis projections — compute raw dot product, then normalize to [0,1]
    const axesVectors = semanticDb.getCachedAxesVectors();
    const axesNames = semanticDb.getCachedAxesNames();
    const axesData = semanticDb.getCachedAxes();
    const normalizedGuessProjections: Record<string, number> = {};
    if (axesVectors && axesNames.length > 0) {
        const dims = guessVec.length;
        for (let a = 0; a < axesNames.length; a++) {
            let dot = 0;
            for (let i = 0; i < dims; i++) {
                dot += guessVec[i]! * axesVectors[a * dims + i]!;
            }
            // Normalize using p5/p95 range (same as legacy normalizeProjection)
            const axis = axesData?.[a];
            if (axis && axis.rangeP95 !== axis.rangeP5) {
                const v = (dot - axis.rangeP5) / (axis.rangeP95 - axis.rangeP5);
                normalizedGuessProjections[axesNames[a]!] = Math.max(0, Math.min(1, v));
            } else {
                normalizedGuessProjections[axesNames[a]!] = 0.5;
            }
        }
    }

    // Compass hints via DB-loaded axes (no embedding matrix needed)
    let compassResult = { hints: [] as any[], status: 'close' as const, totalExplained: 0 };
    const cachedAxes = semanticDb.getCachedAxes();
    if (cachedAxes && axesVectors && axesNames.length > 0) {
        try {
            const { computeCompass } = await import('~/server/utils/semantic');
            // Build lightweight SemanticData shim from DB-cached axes
            const axesRecord: Record<string, any> = {};
            const axesRanges: Record<string, { p5: number; p95: number }> = {};
            const axesAuc: Record<string, number> = {};
            for (const a of cachedAxes) {
                axesRecord[a.name] = { low_anchor: a.lowAnchor, high_anchor: a.highAnchor };
                axesRanges[a.name] = { p5: a.rangeP5, p95: a.rangeP95 };
                axesAuc[a.name] = a.auc;
            }
            compassResult = computeCompass(
                {
                    dims: guessVec.length,
                    axesNames,
                    axesVectors,
                    axes: axesRecord,
                    axesRanges,
                    axesAuc,
                } as any,
                guessVec,
                targetVec,
                5,
                []
            );
        } catch {
            /* compass computation failed — skip */
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
        allProjectionsNormalized: normalizedGuessProjections,
        compass: compassResult.hints,
        compassStatus: compassResult.status,
        compassExplained: compassResult.totalExplained,
        won,
        guessNumber,
    };
    if (won) response.targetWord = target;
    return response;
});
