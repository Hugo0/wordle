/**
 * Semantic Explorer — submit a guess.
 *
 * The canonical "how close" signal is `rank` — the guess's position in the
 * target's vocab-sorted neighbour list (1 = target itself). No cosine
 * stretches, no magic constants. The client derives a log-% display from
 * (rank, totalRanked) for the proximity bar and color gradient.
 *
 * Returns:
 *   - rank: 1-indexed position in target's cosine-sorted neighbour list
 *   - totalRanked: vocab size for log-scaled display
 *   - display: 1 - log(rank)/log(N), capped at 0.99 for non-winning guesses
 *   - similarity: raw cosine (kept for debugging, not for display)
 *   - umapPosition: guess's UMAP coordinates (for map angle)
 *   - allProjectionsNormalized: 20 axis projections for axis-slice view
 *   - compass: top-5 axis deltas with prose + intensity
 *   - won: true when rank === 1 (guess === target)
 */

import {
    computeCompass,
    computeGuessRank,
    cosineSimilarity,
    fetchEmbeddingOnDemand,
    get2dPosition,
    getEmbedding,
    getSessionTarget,
    loadSemanticDataSafe,
    normalizeProjection,
    projectAllAxes,
    rankToDisplay,
} from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/semantic-db';

const USE_DB = process.env.SEMANTIC_DB === '1';

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

    // ── DB-backed path (SEMANTIC_DB=1) ──
    if (USE_DB) {
        const targetVec = await semanticDb.getEmbedding(lang, target);
        if (!targetVec) {
            throw createError({ statusCode: 500, message: 'Target embedding missing' });
        }

        let guessVec = await semanticDb.getEmbedding(lang, word);
        if (!guessVec) {
            if (!/^[a-z][a-z\-']{0,24}$/.test(word)) {
                return { valid: false, word, reason: 'bad_format' };
            }
            // Spellcheck: still uses in-memory valid words set (2MB, loaded at startup)
            const data = loadSemanticDataSafe();
            if (data.validWords.size > 0 && !data.validWords.has(word)) {
                return { valid: false, word, reason: 'not_a_word' };
            }
            guessVec = await fetchEmbeddingOnDemand(data, word);
            if (!guessVec) {
                return { valid: false, word, reason: 'embedding_failed' };
            }
            // Store on-demand embedding in DB for future queries
            semanticDb.storeOnDemandEmbedding(lang, word, guessVec);
        }

        const rawSimilarity = cosineSimilarity(guessVec, targetVec);
        const rank = (await semanticDb.computeGuessRank(lang, target, word, guessVec)) ?? 50001;
        const totalRanked = await semanticDb.getTotalRanked(lang);
        const won = rank === 1;
        const display = won ? 1 : Math.min(0.99, rankToDisplay(rank, totalRanked));
        const umapPosition = await semanticDb.get2dPosition(lang, word);

        // Axis projections — uses cached axes vectors (140KB in memory)
        const axesVectors = semanticDb.getCachedAxesVectors();
        const axesNames = semanticDb.getCachedAxesNames();
        const normalizedGuessProjections: Record<string, number> = {};
        if (axesVectors && axesNames.length > 0) {
            const dims = guessVec.length;
            for (let a = 0; a < axesNames.length; a++) {
                let dot = 0;
                for (let i = 0; i < dims; i++) {
                    dot += guessVec[i]! * axesVectors[a * dims + i]!;
                }
                normalizedGuessProjections[axesNames[a]!] = dot;
            }
        }

        // Compass hints
        const compassResult = computeCompass(loadSemanticDataSafe(), guessVec, targetVec, 5, []);

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
    }

    // ── Legacy in-memory path ──
    const data = loadSemanticDataSafe();
    const targetVec = getEmbedding(data, target);
    if (!targetVec) {
        throw createError({ statusCode: 500, message: 'Target embedding missing' });
    }

    let guessVec = getEmbedding(data, word);
    if (!guessVec) {
        if (!/^[a-z][a-z\-']{0,24}$/.test(word)) {
            return { valid: false, word, reason: 'bad_format' };
        }
        if (data.validWords.size > 0 && !data.validWords.has(word)) {
            return { valid: false, word, reason: 'not_a_word' };
        }
        guessVec = await fetchEmbeddingOnDemand(data, word);
        if (!guessVec) {
            return { valid: false, word, reason: 'embedding_failed' };
        }
    }

    const rawSimilarity = cosineSimilarity(guessVec, targetVec);
    const rank = computeGuessRank(data, target, word, guessVec) ?? data.words.length;
    const totalRanked = data.words.length;
    const won = rank === 1;
    const display = won ? 1 : Math.min(0.99, rankToDisplay(rank, totalRanked));
    const umapPosition = get2dPosition(data, word);

    const guessProjections = projectAllAxes(data, guessVec);
    const normalizedGuessProjections: Record<string, number> = {};
    for (const axis of data.axesNames) {
        normalizedGuessProjections[axis] = normalizeProjection(data, axis, guessProjections[axis]!);
    }

    const compassResult = computeCompass(data, guessVec, targetVec, 5, []);

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
