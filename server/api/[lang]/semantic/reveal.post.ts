/**
 * Semantic Explorer — post-game reveal.
 *
 * Returns the target word + 8 nearest neighbours (in full 512D space),
 * excluding any words the player already guessed. Used to decorate the
 * end-of-game map with labeled neighbours as a learning moment.
 *
 * Each neighbour ships its UMAP position AND all-20-axis normalized projections
 * (so the client can render them in any axis-slice view consistently with
 * how guesses are rendered).
 */

import {
    computeGuessRank,
    get2dPosition,
    getEmbedding,
    getSessionTarget,
    knnNearest,
    loadSemanticDataSafe,
    normalizeProjection,
    projectAllAxes,
    rankToDisplay,
} from '~/server/utils/semantic';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const targetId = body?.targetId as string | undefined;
    const exclude = (body?.exclude as string[] | undefined) ?? [];
    const k = Number(body?.k ?? 8);

    if (!targetId) {
        throw createError({ statusCode: 400, message: 'Missing targetId' });
    }
    const target = getSessionTarget(targetId);
    if (!target) {
        throw createError({ statusCode: 404, message: 'Unknown or expired targetId' });
    }

    const data = loadSemanticDataSafe();
    const targetVec = getEmbedding(data, target);
    if (!targetVec) {
        throw createError({ statusCode: 500, message: 'Target embedding missing' });
    }

    const excludeSet = new Set<string>([target, ...exclude.map((w) => w.toLowerCase().trim())]);
    const neighbours = knnNearest(data, targetVec, k, excludeSet);

    const totalRanked = data.words.length;
    const enriched = neighbours
        .map((n) => {
            const v = getEmbedding(data, n.word);
            if (!v) return null;
            const projs = projectAllAxes(data, v);
            const normProjs: Record<string, number> = {};
            for (const axis of data.axesNames) {
                normProjs[axis] = normalizeProjection(data, axis, projs[axis]!);
            }
            const rank = computeGuessRank(data, target, n.word, v) ?? totalRanked;
            return {
                word: n.word,
                rank,
                totalRanked,
                display: rankToDisplay(rank, totalRanked),
                similarity: n.similarity,
                umapPosition: get2dPosition(data, n.word),
                allProjectionsNormalized: normProjs,
            };
        })
        .filter(Boolean);

    return {
        targetWord: target,
        targetUmapPosition: get2dPosition(data, target),
        neighbours: enriched,
    };
});
