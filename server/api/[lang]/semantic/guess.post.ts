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
    loadSemanticData,
    normalizeProjection,
    projectAllAxes,
    rankToDisplay,
} from '~/server/utils/semantic';

export default defineEventHandler(async (event) => {
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

    const data = loadSemanticData();
    const targetVec = getEmbedding(data, target);
    if (!targetVec) {
        throw createError({ statusCode: 500, message: 'Target embedding missing' });
    }

    let guessVec = getEmbedding(data, word);
    let fromOnDemand = false;
    if (!guessVec) {
        if (!/^[a-z][a-z\-']{0,24}$/.test(word)) {
            return { valid: false, word, reason: 'bad_format' };
        }
        // Spellcheck: reject words that aren't in the validator dictionary.
        // Stops misspellings like "girafe" from getting an OpenAI embedding.
        if (data.validWords.size > 0 && !data.validWords.has(word)) {
            return { valid: false, word, reason: 'not_a_word' };
        }
        guessVec = await fetchEmbeddingOnDemand(data, word);
        if (!guessVec) {
            return { valid: false, word, reason: 'embedding_failed' };
        }
        fromOnDemand = true;
    }

    const rawSimilarity = cosineSimilarity(guessVec, targetVec);
    const rank = computeGuessRank(data, target, word, guessVec) ?? data.words.length;
    const totalRanked = data.words.length;
    const won = rank === 1;
    // Display % — log-scaled rank, capped at 0.99 for non-wins so only the
    // target itself can show 100%.
    const display = won ? 1 : Math.min(0.99, rankToDisplay(rank, totalRanked));

    const umapPosition = get2dPosition(data, word);

    // Per-axis projections (normalized to [0,1]), cached client-side for
    // axis slice view transitions.
    const guessProjections = projectAllAxes(data, guessVec);
    const normalizedGuessProjections: Record<string, number> = {};
    for (const axis of data.axesNames) {
        normalizedGuessProjections[axis] = normalizeProjection(
            data,
            axis,
            guessProjections[axis]!
        );
    }

    // Compass hints: iterative Gram-Schmidt matching pursuit. Return up to 5
    // axes so the client can filter out whichever are currently displayed on
    // a slice view and still have 2 to render. Top 2 are guaranteed orthogonal;
    // positions 3-5 are fallbacks for the slice-view exclude filter. Returns
    // status='close' when the pair is too near for meaningful hints.
    const compassResult = computeCompass(data, guessVec, targetVec, 5, []);

    const response: Record<string, unknown> = {
        valid: true,
        word,
        rank,
        totalRanked,
        display,
        similarity: rawSimilarity, // raw cosine, for debugging only
        umapPosition,
        allProjectionsNormalized: normalizedGuessProjections,
        compass: compassResult.hints,
        compassStatus: compassResult.status,
        compassExplained: compassResult.totalExplained,
        won,
        guessNumber,
        fromOnDemand,
    };

    if (won) {
        response.targetWord = target;
    }

    return response;
});
