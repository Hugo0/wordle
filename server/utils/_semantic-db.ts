/**
 * semantic-db — pgvector-backed semantic operations.
 *
 * Replaces the in-memory Float32Array embedding matrix (~98-230MB) with
 * Postgres queries using pgvector's HNSW index and precomputed neighbor
 * rankings. Activated via SEMANTIC_DB=1 env var.
 *
 * Architecture:
 *   - Rank lookup: precomputed target_neighbors table (btree, O(1))
 *   - kNN: pgvector HNSW index (approximate, ~5-15ms for k=8)
 *   - Compass: fetch 2 vectors from DB, compute dot products in-app
 *   - Axes: loaded into memory at startup (70 × 512 = 140KB, negligible)
 *
 * All functions return null on error — callers can fall back to in-memory.
 */

import { prisma } from './prisma';
import { cosineSimilarity } from './semantic';

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

let _axesCache: { lang: string; axes: AxisData[]; axesVectors: Float32Array } | null = null;

/**
 * Load axis data from DB. Called once at startup, cached forever.
 * Total size: ~140KB (70 axes × 512 dims × 4 bytes). Negligible.
 */
export async function loadAxes(lang: string = 'en'): Promise<AxisData[]> {
    if (_axesCache?.lang === lang) return _axesCache.axes;

    const rows = await prisma.$queryRaw<
        Array<{
            name: string;
            low_anchor: string;
            high_anchor: string;
            vector: string; // pgvector returns as string "[0.1,0.2,...]"
            auc: number | null;
            range_p5: number | null;
            range_p95: number | null;
        }>
    >`SELECT name, low_anchor, high_anchor, vector::text, auc, range_p5, range_p95
      FROM wordle.semantic_axes WHERE lang = ${lang} ORDER BY name`;

    const axes: AxisData[] = rows.map((r) => ({
        name: r.name,
        lowAnchor: r.low_anchor,
        highAnchor: r.high_anchor,
        vector: parseVector(r.vector),
        auc: r.auc ?? 0,
        rangeP5: r.range_p5 ?? 0,
        rangeP95: r.range_p95 ?? 0,
    }));

    // Build concatenated axes vector array for fast dot products
    const dims = axes[0]?.vector.length ?? 512;
    const axesVectors = new Float32Array(axes.length * dims);
    for (let a = 0; a < axes.length; a++) {
        axesVectors.set(axes[a]!.vector, a * dims);
    }

    _axesCache = { lang, axes, axesVectors };
    return axes;
}

/** Get cached axes vectors for dot product computation. */
export function getCachedAxesVectors(): Float32Array | null {
    return _axesCache?.axesVectors ?? null;
}

/** Get cached axis names in order. */
export function getCachedAxesNames(): string[] {
    return _axesCache?.axes.map((a) => a.name) ?? [];
}

/** Get cached axis data (for normalization ranges). */
export function getCachedAxes(): AxisData[] | null {
    return _axesCache?.axes ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Embedding lookups
// ═══════════════════════════════════════════════════════════════════════════

/** Fetch a single word's embedding vector from the DB. */
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

/** Fetch UMAP or PCA2D coordinates for a word. */
export async function get2dPosition(
    lang: string,
    word: string,
    projection: 'umap' | 'pca2d' = 'umap'
): Promise<[number, number] | null> {
    try {
        const col1 = projection === 'umap' ? 'umap_x' : 'pca2d_x';
        const col2 = projection === 'umap' ? 'umap_y' : 'pca2d_y';
        const rows = await prisma.$queryRaw<Array<{ x: number; y: number }>>`
            SELECT ${prisma.$raw(col1)} as x, ${prisma.$raw(col2)} as y
            FROM wordle.word_embeddings
            WHERE lang = ${lang} AND word = ${word} LIMIT 1
        `;
        if (!rows.length || rows[0]!.x == null) return null;
        return [rows[0]!.x, rows[0]!.y];
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Rank computation (via precomputed target_neighbors table)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Look up the rank of a guess word relative to a target.
 * Uses the precomputed target_neighbors table (top 5k per target).
 *
 * For in-vocab words within the top 5k: O(1) btree lookup.
 * For out-of-vocab or low-ranked words: fetch both vectors, compute
 * cosine, then count how many top-5k neighbors have higher cosine.
 */
export async function computeGuessRank(
    lang: string,
    target: string,
    guess: string,
    guessVec?: Float32Array
): Promise<number | null> {
    if (guess === target) return 1;

    try {
        // Fast path: precomputed rank lookup
        const rows = await prisma.$queryRaw<Array<{ rank: number }>>`
            SELECT rank FROM wordle.target_neighbors
            WHERE lang = ${lang} AND target_word = ${target} AND word = ${guess}
            LIMIT 1
        `;
        if (rows.length) return rows[0]!.rank;

        // Slow path: word not in top 5k (or out-of-vocab)
        // Fetch both vectors, compute cosine, count how many top-5k beat it
        const gVec = guessVec ?? (await getEmbedding(lang, guess));
        const tVec = await getEmbedding(lang, target);
        if (!gVec || !tVec) return null;

        const guessCos = cosineSimilarity(gVec, tVec);

        // Count neighbors with higher cosine (all 5k are stored)
        const countRows = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
            SELECT COUNT(*) as cnt FROM wordle.target_neighbors
            WHERE lang = ${lang} AND target_word = ${target} AND cosine > ${guessCos}
        `;
        const betterCount = Number(countRows[0]?.cnt ?? 0);
        return betterCount + 1;
    } catch (e) {
        console.warn('[semantic-db] computeGuessRank failed:', e);
        return null;
    }
}

/**
 * Get the total number of ranked words (vocab size). Cached in memory
 * after first query — changes only when the seed script runs.
 */
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

/**
 * Find the k nearest neighbors to a word using pgvector's HNSW index.
 * Uses cosine distance operator (<=>).
 */
export async function knnNearest(
    lang: string,
    word: string,
    k: number,
    excludeWords: string[] = []
): Promise<NeighborResult[]> {
    try {
        // Get the word's embedding first
        const vec = await getEmbedding(lang, word);
        if (!vec) return [];

        return knnNearestByVector(lang, vec, k, excludeWords);
    } catch {
        return [];
    }
}

/**
 * Find k nearest neighbors by raw vector (for on-demand embeddings).
 */
export async function knnNearestByVector(
    lang: string,
    vec: Float32Array,
    k: number,
    excludeWords: string[] = []
): Promise<NeighborResult[]> {
    try {
        const vecStr = `[${Array.from(vec).join(',')}]`;

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

        return rows.map((r) => ({
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

/**
 * Store an on-demand embedding (out-of-vocab word) in the DB.
 */
export async function storeOnDemandEmbedding(
    lang: string,
    word: string,
    vec: Float32Array
): Promise<void> {
    try {
        const vecStr = `[${Array.from(vec).join(',')}]`;
        await prisma.$executeRaw`
            INSERT INTO wordle.word_embeddings (lang, word, embedding, is_target, is_vocab)
            VALUES (${lang}, ${word}, ${vecStr}::vector, false, false)
            ON CONFLICT (lang, word) DO UPDATE SET embedding = ${vecStr}::vector
        `;
    } catch {
        // Non-critical — in-memory cache still works as fallback
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Vocab + target queries
// ═══════════════════════════════════════════════════════════════════════════

/** Get all target words for a language. */
export async function getTargets(lang: string): Promise<string[]> {
    try {
        const rows = await prisma.$queryRaw<Array<{ word: string }>>`
            SELECT word FROM wordle.word_embeddings
            WHERE lang = ${lang} AND is_target = true
            ORDER BY word
        `;
        return rows.map((r) => r.word);
    } catch {
        return [];
    }
}

/** Check if a word exists in the embedding vocabulary. */
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

// ═══════════════════════════════════════════════════════════════════════════
// On-demand embeddings (out-of-vocab words via OpenAI)
// ═══════════════════════════════════════════════════════════════════════════

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMS = 512;

/**
 * Fetch an embedding for an out-of-vocab word via OpenAI, normalize it,
 * store in DB, and return. Returns null if OpenAI unavailable or fails.
 * Deduplicated — concurrent calls for the same word share one API request.
 */
export async function fetchOnDemandEmbedding(
    lang: string,
    word: string
): Promise<Float32Array | null> {
    // Already in DB?
    const existing = await getEmbedding(lang, word);
    if (existing) return existing;

    const { dedup } = await import('./inflight');
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

            // L2-normalize
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
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Parse pgvector's string representation "[0.1,0.2,...]" into Float32Array. */
function parseVector(pgvectorStr: string): Float32Array {
    const nums = pgvectorStr.replace(/^\[/, '').replace(/\]$/, '').split(',').map(Number);
    return new Float32Array(nums);
}

// cosineSimilarity imported from ./semantic (DRY — pre-normalized dot product)
