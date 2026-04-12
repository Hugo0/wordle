/**
 * GET /api/[lang]/word-explore/[slug]
 *
 * Semantic exploration data for a word: normalized axis projections,
 * nearest neighbors with UMAP + projections, cosine similarity.
 *
 * The top FOREGROUND_COUNT neighbors include axis projections so the
 * client can render foreground dots AND lens/slice views from a single
 * request — no per-word follow-up fetches needed.
 */
import { cosineSimilarity } from '../../../utils/semantic';
import * as semanticDb from '~/server/utils/_semantic-db';
import { resolveWordSlug } from '../../../utils/word-selection';
import { loadAllData } from '../../../utils/data-loader';

const NEIGHBOR_COUNT = 80;
const FOREGROUND_COUNT = 15;

const EMPTY_RESPONSE = {
    projections: [] as Array<unknown>,
    nearest: [] as Array<unknown>,
    umap: null as [number, number] | null,
    similarityTo: null as number | null,
    available: false,
};

export default defineEventHandler(async (event) => {
    const lang = getRouterParam(event, 'lang')!;
    const slug = decodeURIComponent(getRouterParam(event, 'slug')!);
    const query = getQuery(event);
    const relativeTo = typeof query.relativeTo === 'string' ? query.relativeTo.toLowerCase() : null;

    const data = loadAllData();
    if (!data.languageCodes.includes(lang)) {
        throw createError({ statusCode: 404, message: 'Unknown language' });
    }

    const resolved = resolveWordSlug(lang, slug);
    if (resolved.kind === 'invalid') {
        throw createError({ statusCode: 400, message: 'Invalid slug' });
    }
    const word = resolved.word;
    if (!word) {
        throw createError({ statusCode: 404, message: 'Word not found' });
    }

    if (lang !== 'en') {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    let vec = await semanticDb.getEmbedding(lang, word);
    const inVocab = vec !== null;
    if (!vec) {
        vec = await semanticDb.fetchOnDemandEmbedding(lang, word);
    }
    if (!vec) {
        return { word, inVocab: false, ...EMPTY_RESPONSE };
    }

    const projections = semanticDb.projectAxesDetailed(vec, 0.8);

    const [neighbors, umap] = await Promise.all([
        semanticDb.knnNearestByVector(lang, vec, NEIGHBOR_COUNT, [word]),
        semanticDb.get2dPosition(lang, word),
    ]);

    // Batch-fetch embeddings for foreground neighbors to compute their projections.
    // Pure math on cached axis vectors — no extra DB round-trips beyond the batch fetch.
    const foregroundWords = neighbors.slice(0, FOREGROUND_COUNT).map((n) => n.word);
    const foregroundVecs = await semanticDb.getEmbeddings(lang, foregroundWords);

    const nearest = neighbors.map((n, i) => {
        const entry: Record<string, unknown> = {
            word: n.word,
            similarity: n.similarity,
            umap: n.umapX != null ? [n.umapX, n.umapY] : null,
        };
        // Include projections for foreground candidates
        if (i < FOREGROUND_COUNT) {
            const nVec = foregroundVecs.get(n.word);
            if (nVec) {
                entry.projections = semanticDb.projectAxes(nVec);
            }
        }
        return entry;
    });

    let similarityTo: number | null = null;
    if (relativeTo) {
        if (relativeTo === word) {
            similarityTo = 1;
        } else {
            let otherVec = await semanticDb.getEmbedding(lang, relativeTo);
            if (!otherVec) otherVec = await semanticDb.fetchOnDemandEmbedding(lang, relativeTo);
            if (otherVec) similarityTo = cosineSimilarity(vec, otherVec);
        }
    }

    return {
        word,
        inVocab,
        projections,
        nearest,
        umap,
        similarityTo,
        available: true,
    };
});
