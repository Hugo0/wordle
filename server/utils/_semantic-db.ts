/**
 * semantic-db — pgvector-backed semantic operations.
 *
 * All embedding lookups, rank computation, kNN, and axis projections
 * go through Postgres. Only axes (140KB) and targets (~10KB) are
 * cached in memory after first load.
 */

import { prisma } from './prisma';
import { cosineSimilarity } from './semantic';
import { dedup } from './inflight';

export { type AxisData };

export const EMBEDDING_MODEL = 'text-embedding-3-large';
export const EMBEDDING_DIMS = 512;

// ═══════════════════════════════════════════════════════════════════════════
// Axis data (loaded once at startup, cached in memory — 140KB)
// ═══════════════════════════════════════════════════════════════════════════

interface AxisData {
    name: string;
    lowAnchor: string;
    highAnchor: string;
    vector: Float32Array;
    auc: number;
    rangeP5: number;
    rangeP95: number;
}

let _axesCache: {
    lang: string;
    axes: AxisData[];
    axesNames: string[];
    axesVectors: Float32Array;
} | null = null;

export async function loadAxes(lang: string = 'en'): Promise<AxisData[]> {
    if (_axesCache?.lang === lang) return _axesCache.axes;

    const rows = await prisma.$queryRaw<
        Array<{
            name: string;
            low_anchor: string;
            high_anchor: string;
            vector: string;
            auc: number | null;
            range_p5: number | null;
            range_p95: number | null;
        }>
    >`SELECT name, low_anchor, high_anchor, vector::text, auc, range_p5, range_p95
      FROM wordle.semantic_axes WHERE lang = ${lang} ORDER BY name`;

    const axes: AxisData[] = rows.map((r: { name: string; low_anchor: string; high_anchor: string; vector: string; auc: number | null; range_p5: number | null; range_p95: number | null }) => ({
        name: r.name,
        lowAnchor: r.low_anchor,
        highAnchor: r.high_anchor,
        vector: parseVector(r.vector),
        auc: r.auc ?? 0,
        rangeP5: r.range_p5 ?? 0,
        rangeP95: r.range_p95 ?? 0,
    }));

    const dims = axes[0]?.vector.length ?? EMBEDDING_DIMS;
    const axesVectors = new Float32Array(axes.length * dims);
    for (let a = 0; a < axes.length; a++) {
        axesVectors.set(axes[a]!.vector, a * dims);
    }

    const axesNames = axes.map((a) => a.name);
    _axesCache = { lang, axes, axesNames, axesVectors };
    return axes;
}

export function getCachedAxesVectors(): Float32Array | null {
    return _axesCache?.axesVectors ?? null;
}

export function getCachedAxesNames(): string[] {
    return _axesCache?.axesNames ?? [];
}

export function getCachedAxes(): AxisData[] | null {
    return _axesCache?.axes ?? null;
}

/**
 * Compute normalized [0,1] axis projections for a word vector.
 * Optionally filter by minimum AUC coherence score.
 */
export function projectAxes(
    vec: Float32Array,
    opts?: { minAuc?: number; includeRaw?: boolean }
): Record<string, number> {
    const axes = _axesCache?.axes;
    const axesVectors = _axesCache?.axesVectors;
    if (!axes || !axesVectors) return {};

    const D = vec.length;
    const minAuc = opts?.minAuc ?? 0;
    const result: Record<string, number> = {};

    for (let a = 0; a < axes.length; a++) {
        const axis = axes[a]!;
        if (axis.auc < minAuc) continue;
        let dot = 0;
        const offset = a * D;
        for (let i = 0; i < D; i++) dot += vec[i]! * axesVectors[offset + i]!;

        if (axis.rangeP95 !== axis.rangeP5) {
            result[axis.name] = Math.max(
                0,
                Math.min(1, (dot - axis.rangeP5) / (axis.rangeP95 - axis.rangeP5))
            );
        } else {
            result[axis.name] = 0.5;
        }
    }
    return result;
}

/**
 * Detailed axis projections with anchor labels (for word-explore endpoint).
 */
export function projectAxesDetailed(
    vec: Float32Array,
    minAuc: number = 0.8
): Array<{
    axis: string;
    lowAnchor: string;
    highAnchor: string;
    normalized: number;
    rawProjection: number;
}> {
    const axes = _axesCache?.axes;
    const axesVectors = _axesCache?.axesVectors;
    if (!axes || !axesVectors) return [];

    const D = vec.length;
    const result = [];

    for (let a = 0; a < axes.length; a++) {
        const axis = axes[a]!;
        if (axis.auc < minAuc) continue;
        let dot = 0;
        const offset = a * D;
        for (let i = 0; i < D; i++) dot += vec[i]! * axesVectors[offset + i]!;

        let normalized = 0.5;
        if (axis.rangeP95 !== axis.rangeP5) {
            normalized = Math.max(
                0,
                Math.min(1, (dot - axis.rangeP5) / (axis.rangeP95 - axis.rangeP5))
            );
        }
        result.push({
            axis: axis.name,
            lowAnchor: axis.lowAnchor,
            highAnchor: axis.highAnchor,
            normalized,
            rawProjection: dot,
        });
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Embedding lookups
// ═══════════════════════════════════════════════════════════════════════════

/** Batch-fetch embeddings for multiple words (1 query). */
export async function getEmbeddings(
    lang: string,
    words: string[]
): Promise<Map<string, Float32Array>> {
    if (!words.length) return new Map();
    try {
        const rows = await prisma.$queryRaw<Array<{ word: string; vector: string }>>`
            SELECT word, embedding::text as vector FROM wordle.word_embeddings
            WHERE lang = ${lang} AND word = ANY(${words}::text[])
        `;
        const result = new Map<string, Float32Array>();
        for (const r of rows) result.set(r.word, parseVector(r.vector));
        return result;
    } catch {
        return new Map();
    }
}

export async function getEmbedding(lang: string, word: string): Promise<Float32Array | null> {
    try {
        const rows = await prisma.$queryRaw<Array<{ vector: string }>>`
            SELECT embedding::text as vector FROM wordle.word_embeddings
            WHERE lang = ${lang} AND word = ${word} LIMIT 1
        `;
        if (!rows.length) return null;
        return parseVector(rows[0]!.vector);
    } catch {
        return null;
    }
}

export async function get2dPosition(
    lang: string,
    word: string,
    projection: 'umap' | 'pca2d' = 'umap'
): Promise<[number, number] | null> {
    try {
        const rows = await prisma.$queryRaw<
            Array<{
                umap_x: number | null;
                umap_y: number | null;
                pca2d_x: number | null;
                pca2d_y: number | null;
            }>
        >`
            SELECT umap_x, umap_y, pca2d_x, pca2d_y
            FROM wordle.word_embeddings
            WHERE lang = ${lang} AND word = ${word} LIMIT 1
        `;
        if (!rows.length) return null;
        const r = rows[0]!;
        const x = projection === 'umap' ? r.umap_x : r.pca2d_x;
        const y = projection === 'umap' ? r.umap_y : r.pca2d_y;
        if (x == null || y == null) return null;
        return [x, y];
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank computation (via precomputed target_neighbors table)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Look up the rank of a guess word relative to a target.
 * Fast path: O(1) btree lookup on precomputed top-5k neighbors.
 * Slow path: fetch vectors, compute cosine, count how many beat it.
 */
export async function computeGuessRank(
    lang: string,
    target: string,
    guess: string,
    guessVec?: Float32Array,
    targetVec?: Float32Array
): Promise<number | null> {
    if (guess === target) return 1;

    try {
        const rows = await prisma.$queryRaw<Array<{ rank: number }>>`
            SELECT rank FROM wordle.target_neighbors
            WHERE lang = ${lang} AND target_word = ${target} AND word = ${guess}
            LIMIT 1
        `;
        if (rows.length) return rows[0]!.rank;

        // Slow path: word outside top 5k.
        // Estimate rank by Monte Carlo sampling: compute cosine of the
        // target against ~500 pre-cached random vocab embeddings, count
        // what fraction are closer than the guess, extrapolate to full vocab.
        const [gVec, tVec] = await Promise.all([
            guessVec ? Promise.resolve(guessVec) : getEmbedding(lang, guess),
            targetVec ? Promise.resolve(targetVec) : getEmbedding(lang, target),
        ]);
        if (!gVec || !tVec) return null;

        const guessCos = cosineSimilarity(gVec, tVec);
        const total = await getTotalRanked(lang);
        const sample = await getRankSample(lang);
        if (!sample) return null;

        // Compute cosines of all sample words to the target
        const D = tVec.length;
        const cosines = new Float32Array(sample.count);
        for (let s = 0; s < sample.count; s++) {
            let dot = 0;
            const offset = s * D;
            for (let i = 0; i < D; i++) dot += tVec[i]! * sample.vectors[offset + i]!;
            cosines[s] = dot;
        }

        // Sort descending to find where guessCos falls
        const sorted = Array.from(cosines).sort((a, b) => b - a);
        // Find the two adjacent sample cosines that bracket guessCos
        let lo = 0;
        while (lo < sorted.length && sorted[lo]! > guessCos) lo++;
        // lo = number of samples with higher cosine

        // Interpolate within the bucket using exact cosine position
        const bucketSize = total / sample.count;
        let fractional = 0;
        if (lo > 0 && lo < sorted.length) {
            const hiCos = sorted[lo - 1]!; // nearest sample above
            const loCos = sorted[lo]!; // nearest sample below
            if (hiCos !== loCos) {
                fractional = (hiCos - guessCos) / (hiCos - loCos);
            }
        }

        return Math.max(1, Math.round((lo + fractional) * bucketSize));
    } catch (e) {
        console.warn('[semantic-db] computeGuessRank failed:', e);
        return null;
    }
}

/** Batch-fetch ranks for multiple words (1 query instead of N). */
export async function batchGetRanks(
    lang: string,
    target: string,
    words: string[]
): Promise<Map<string, number>> {
    if (words.length === 0) return new Map();
    try {
        const rows = await prisma.$queryRaw<Array<{ word: string; rank: number }>>`
            SELECT word, rank FROM wordle.target_neighbors
            WHERE lang = ${lang} AND target_word = ${target} AND word = ANY(${words}::text[])
        `;
        return new Map(rows.map((r: { word: string; rank: number }) => [r.word, r.rank]));
    } catch {
        return new Map();
    }
}

const _totalRankedCache = new Map<string, number>();
export async function getTotalRanked(lang: string): Promise<number> {
    const cached = _totalRankedCache.get(lang);
    if (cached !== undefined) return cached;
    try {
        const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
            SELECT COUNT(*) as cnt FROM wordle.word_embeddings
            WHERE lang = ${lang} AND is_vocab = true
        `;
        const count = Number(rows[0]?.cnt ?? 0);
        _totalRankedCache.set(lang, count);
        return count;
    } catch {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// k-Nearest Neighbors (pgvector HNSW)
// ═══════════════════════════════════════════════════════════════════════════

export interface NeighborResult {
    word: string;
    similarity: number;
    umapX?: number;
    umapY?: number;
    pca2dX?: number;
    pca2dY?: number;
}

export async function knnNearest(
    lang: string,
    word: string,
    k: number,
    excludeWords: string[] = []
): Promise<NeighborResult[]> {
    try {
        const vec = await getEmbedding(lang, word);
        if (!vec) return [];
        return knnNearestByVector(lang, vec, k, excludeWords);
    } catch {
        return [];
    }
}

export async function knnNearestByVector(
    lang: string,
    vec: Float32Array,
    k: number,
    excludeWords: string[] = []
): Promise<NeighborResult[]> {
    try {
        const vecStr = toVectorLiteral(vec);
        const rows = await prisma.$queryRaw<
            Array<{
                word: string;
                similarity: number;
                umap_x: number | null;
                umap_y: number | null;
                pca2d_x: number | null;
                pca2d_y: number | null;
            }>
        >`
            SELECT word,
                   1 - (embedding <=> ${vecStr}::vector) as similarity,
                   umap_x, umap_y, pca2d_x, pca2d_y
            FROM wordle.word_embeddings
            WHERE lang = ${lang}
              AND is_vocab = true
              AND word != ALL(${excludeWords}::text[])
            ORDER BY embedding <=> ${vecStr}::vector
            LIMIT ${k}
        `;
        return rows.map((r: { word: string; similarity: number; umap_x: number | null; umap_y: number | null; pca2d_x: number | null; pca2d_y: number | null }) => ({
            word: r.word,
            similarity: r.similarity,
            umapX: r.umap_x ?? undefined,
            umapY: r.umap_y ?? undefined,
            pca2dX: r.pca2d_x ?? undefined,
            pca2dY: r.pca2d_y ?? undefined,
        }));
    } catch (e) {
        console.warn('[semantic-db] knnNearest failed:', e);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Vocab + target queries (cached after first call)
// ═══════════════════════════════════════════════════════════════════════════

const _targetsCache = new Map<string, string[]>();
export async function getTargets(lang: string): Promise<string[]> {
    const cached = _targetsCache.get(lang);
    if (cached) return cached;
    try {
        const rows = await prisma.$queryRaw<Array<{ word: string }>>`
            SELECT word FROM wordle.word_embeddings
            WHERE lang = ${lang} AND is_target = true
            ORDER BY word
        `;
        const targets = rows.map((r: { word: string }) => r.word);
        _targetsCache.set(lang, targets);
        return targets;
    } catch {
        return [];
    }
}

export async function wordExists(lang: string, word: string): Promise<boolean> {
    try {
        const rows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
            SELECT COUNT(*) as cnt FROM wordle.word_embeddings
            WHERE lang = ${lang} AND word = ${word}
        `;
        return Number(rows[0]?.cnt ?? 0) > 0;
    } catch {
        return false;
    }
}

export async function storeOnDemandEmbedding(
    lang: string,
    word: string,
    vec: Float32Array
): Promise<void> {
    try {
        const vecStr = toVectorLiteral(vec);
        await prisma.$executeRaw`
            INSERT INTO wordle.word_embeddings (lang, word, embedding, is_target, is_vocab)
            VALUES (${lang}, ${word}, ${vecStr}::vector, false, false)
            ON CONFLICT (lang, word) DO UPDATE SET embedding = ${vecStr}::vector
        `;
    } catch {
        // Non-critical
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// On-demand embeddings (out-of-vocab words via OpenAI)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch an embedding for an out-of-vocab word via OpenAI, normalize it,
 * store in DB, and return. Caller should check getEmbedding first — this
 * function does NOT re-check the DB (to avoid a redundant round-trip).
 */
export async function fetchOnDemandEmbedding(
    lang: string,
    word: string
): Promise<Float32Array | null> {
    return dedup('embedding', `${lang}:${word}`, async () => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return null;

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: EMBEDDING_MODEL,
                    input: [word],
                    dimensions: EMBEDDING_DIMS,
                }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
                console.warn('[semantic-db] on-demand embedding failed:', response.status);
                return null;
            }
            const payload = await response.json();
            const raw = payload?.data?.[0]?.embedding as number[] | undefined;
            if (!raw || raw.length !== EMBEDDING_DIMS) return null;

            let norm = 0;
            for (let i = 0; i < raw.length; i++) norm += raw[i]! * raw[i]!;
            norm = Math.sqrt(norm) || 1;
            const vec = new Float32Array(EMBEDDING_DIMS);
            for (let i = 0; i < EMBEDDING_DIMS; i++) vec[i] = raw[i]! / norm;

            await storeOnDemandEmbedding(lang, word, vec);
            return vec;
        } catch (e) {
            console.warn('[semantic-db] on-demand embedding error:', e);
            return null;
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank estimation sample (loaded once, ~1MB, for Monte Carlo slow-path)
// ═══════════════════════════════════════════════════════════════════════════

const RANK_SAMPLE_SIZE = 500;
let _rankSample: { lang: string; count: number; vectors: Float32Array } | null = null;

/** Load a random sample of vocab embeddings for rank estimation. */
async function getRankSample(
    lang: string
): Promise<{ count: number; vectors: Float32Array } | null> {
    if (_rankSample?.lang === lang) return _rankSample;
    try {
        const rows = await prisma.$queryRaw<Array<{ vector: string }>>`
            SELECT embedding::text as vector FROM wordle.word_embeddings
            WHERE lang = ${lang} AND is_vocab = true
            ORDER BY random() LIMIT ${RANK_SAMPLE_SIZE}
        `;
        const dims = EMBEDDING_DIMS;
        const vectors = new Float32Array(rows.length * dims);
        for (let i = 0; i < rows.length; i++) {
            vectors.set(parseVector(rows[i]!.vector), i * dims);
        }
        _rankSample = { lang, count: rows.length, vectors };
        return _rankSample;
    } catch {
        return null;
    }
}

function parseVector(pgvectorStr: string): Float32Array {
    const nums = pgvectorStr.replace(/^\[/, '').replace(/\]$/, '').split(',').map(Number);
    return new Float32Array(nums);
}

function toVectorLiteral(vec: Float32Array): string {
    return `[${Array.from(vec).join(',')}]`;
}
