/**
 * Semantic Explorer — post-game reveal.
 *
 * Returns the target word + k nearest neighbours via pgvector HNSW.
 * Each neighbour ships UMAP position for map rendering.
 */

import { getSessionTarget, rankToDisplay } from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/_semantic-db';

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang') ?? 'en';
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

    const excludeList = [target, ...exclude.map((w) => w.toLowerCase().trim())];

    const [targetUmap, neighbours, totalRanked] = await Promise.all([
        semanticDb.get2dPosition(lang, target),
        semanticDb.knnNearest(lang, target, k, excludeList),
        semanticDb.getTotalRanked(lang),
    ]);

    const neighborWords = neighbours.map((n) => n.word);
    const [rankMap, embeddings] = await Promise.all([
        semanticDb.batchGetRanks(lang, target, neighborWords),
        semanticDb.getEmbeddings(lang, neighborWords),
    ]);
    // Project each neighbour onto the semantic axes for slice view
    const projections = new Map<string, Record<string, number>>();
    for (const w of neighborWords) {
        const vec = embeddings.get(w);
        projections.set(w, vec ? semanticDb.projectAxes(vec) : {});
    }

    const enriched = neighbours.map((n) => ({
        word: n.word,
        rank: rankMap.get(n.word) ?? totalRanked,
        totalRanked,
        display: rankToDisplay(rankMap.get(n.word) ?? totalRanked, totalRanked),
        similarity: n.similarity,
        umapPosition: n.umapX != null ? [n.umapX, n.umapY] : null,
        allProjectionsNormalized: projections.get(n.word) ?? {},
    }));

    return {
        targetWord: target,
        targetUmapPosition: targetUmap,
        neighbours: enriched,
    };
});
