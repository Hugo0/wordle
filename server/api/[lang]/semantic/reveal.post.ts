/**
 * Semantic Explorer — post-game reveal.
 *
 * Returns the target word + k nearest neighbours via pgvector HNSW.
 * Each neighbour ships UMAP position for map rendering.
 */

import { getSessionTarget, rankToDisplay } from '~/server/utils/semantic';
import * as semanticDb from '~/server/utils/semantic-db';

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

    // Parallel: target position + neighbors + total ranked
    const [targetUmap, neighbours, totalRanked] = await Promise.all([
        semanticDb.get2dPosition(lang, target),
        semanticDb.knnNearest(lang, target, k, excludeList),
        semanticDb.getTotalRanked(lang),
    ]);

    // Batch-fetch ranks for all neighbors in one query
    const neighborWords = neighbours.map((n) => n.word);
    const ranks = await batchGetRanks(lang, target, neighborWords, totalRanked);

    const enriched = neighbours.map((n, i) => ({
        word: n.word,
        rank: ranks[i] ?? totalRanked,
        totalRanked,
        display: rankToDisplay(ranks[i] ?? totalRanked, totalRanked),
        similarity: n.similarity,
        umapPosition: n.umapX != null ? [n.umapX, n.umapY] : null,
        allProjectionsNormalized: {} as Record<string, number>,
    }));

    return {
        targetWord: target,
        targetUmapPosition: targetUmap,
        neighbours: enriched,
    };
});

/** Batch-fetch ranks from target_neighbors table (1 query instead of N). */
async function batchGetRanks(
    lang: string,
    target: string,
    words: string[],
    defaultRank: number
): Promise<number[]> {
    if (words.length === 0) return [];
    try {
        const { prisma } = await import('~/server/utils/prisma');
        const rows = await prisma.$queryRaw<Array<{ word: string; rank: number }>>`
            SELECT word, rank FROM wordle.target_neighbors
            WHERE lang = ${lang} AND target_word = ${target} AND word = ANY(${words}::text[])
        `;
        const rankMap = new Map(rows.map((r) => [r.word, r.rank]));
        return words.map((w) => rankMap.get(w) ?? defaultRank);
    } catch {
        return words.map(() => defaultRank);
    }
}
