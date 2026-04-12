/**
 * Seed Postgres with semantic embeddings + precompute target neighbors.
 *
 * This is a heavy script (~30 minutes for target_neighbors) that should
 * be run locally, NOT on the production server.
 *
 * Steps:
 *   1. Read embeddings from .f32 binary (or .json fallback)
 *   2. Read metadata: umap, pca2d, targets, vocabulary, axes
 *   3. Batch-insert into word_embeddings table
 *   4. Insert axes into semantic_axes table
 *   5. Precompute target_neighbors (879 targets × top 5k vocab)
 *
 * Usage: npx tsx scripts/seed-semantic-db.ts
 *
 * Requires: DATABASE_URL env var, pgvector extension enabled
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
});

const SEMANTIC_DIR = join(process.cwd(), 'data', 'semantic');
const RUNTIME_DIR = join(process.cwd(), 'semantic-runtime');
const LANG = 'en';
const DIMS = 512;
const TOP_K_NEIGHBORS = 5000;
const BATCH_SIZE = 500;

// ═══════════════════════════════════════════════════════════════════════════
// Data loading (same logic as server/utils/semantic.ts)
// ═══════════════════════════════════════════════════════════════════════════

function loadEmbeddings(): { words: string[]; embeddings: Float32Array } {
    // Try binary .f32 first
    const f32Path = existsSync(join(RUNTIME_DIR, 'embeddings.f32'))
        ? join(RUNTIME_DIR, 'embeddings.f32')
        : join(SEMANTIC_DIR, 'embeddings.f32');
    const metaPath = existsSync(join(RUNTIME_DIR, 'embeddings.meta.json'))
        ? join(RUNTIME_DIR, 'embeddings.meta.json')
        : join(SEMANTIC_DIR, 'embeddings.meta.json');

    if (existsSync(f32Path) && existsSync(metaPath)) {
        console.log('[load] Using binary .f32 format');
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        const buf = readFileSync(f32Path);
        const embeddings = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        return { words: meta.words, embeddings };
    }

    // Fallback to JSON
    const jsonPath = existsSync(join(RUNTIME_DIR, 'embeddings.json'))
        ? join(RUNTIME_DIR, 'embeddings.json')
        : join(SEMANTIC_DIR, 'embeddings.json');

    console.log('[load] Using JSON format (slow)');
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const words: string[] = data.words;
    const N = words.length;
    const embeddings = new Float32Array(N * DIMS);
    for (let i = 0; i < N; i++) {
        const vec = data.vectors[i];
        for (let j = 0; j < DIMS; j++) {
            embeddings[i * DIMS + j] = vec[j];
        }
    }
    return { words, embeddings };
}

function loadJson<T>(filename: string): T {
    const runtimePath = join(RUNTIME_DIR, filename);
    const staticPath = join(SEMANTIC_DIR, filename);
    const p = existsSync(runtimePath) ? runtimePath : staticPath;
    return JSON.parse(readFileSync(p, 'utf-8')) as T;
}

// ═══════════════════════════════════════════════════════════════════════════
// Seeding
// ═══════════════════════════════════════════════════════════════════════════

async function seedWordEmbeddings() {
    const { words, embeddings } = loadEmbeddings();
    const targetsData = loadJson<{ targets?: string[] } | string[]>('targets.json');
    const targets = new Set<string>(Array.isArray(targetsData) ? targetsData : targetsData.targets ?? []);
    const umap = loadJson<Record<string, [number, number]>>('umap.json');
    const pca2d = loadJson<Record<string, [number, number]>>('pca2d.json');
    const vocabData = loadJson<{ words?: string[] } | string[]>('vocabulary.json');
    const vocabulary = new Set<string>(Array.isArray(vocabData) ? vocabData : vocabData.words ?? []);

    const N = words.length;
    console.log(`[seed] Inserting ${N} word embeddings...`);

    // Clear existing data for this language
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM wordle.word_embeddings WHERE lang = $1', [LANG]);

        // Batch insert
        for (let batch = 0; batch < N; batch += BATCH_SIZE) {
            const end = Math.min(batch + BATCH_SIZE, N);
            const values: string[] = [];
            const params: any[] = [];
            let paramIdx = 1;

            for (let i = batch; i < end; i++) {
                const word = words[i]!;
                const vec = Array.from(
                    embeddings.subarray(i * DIMS, (i + 1) * DIMS)
                );
                const vecStr = `[${vec.join(',')}]`;
                const umapCoords = umap[word];
                const pca2dCoords = pca2d[word];

                values.push(
                    `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}::vector, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`
                );
                params.push(
                    LANG,
                    word,
                    vecStr,
                    umapCoords?.[0] ?? null,
                    umapCoords?.[1] ?? null,
                    pca2dCoords?.[0] ?? null,
                    pca2dCoords?.[1] ?? null,
                    targets.has(word),
                    vocabulary.has(word)
                );
            }

            await client.query(
                `INSERT INTO wordle.word_embeddings (lang, word, embedding, umap_x, umap_y, pca2d_x, pca2d_y, is_target, is_vocab)
                 VALUES ${values.join(', ')}
                 ON CONFLICT (lang, word) DO UPDATE SET
                   embedding = EXCLUDED.embedding,
                   umap_x = EXCLUDED.umap_x,
                   umap_y = EXCLUDED.umap_y,
                   pca2d_x = EXCLUDED.pca2d_x,
                   pca2d_y = EXCLUDED.pca2d_y,
                   is_target = EXCLUDED.is_target,
                   is_vocab = EXCLUDED.is_vocab`,
                params
            );

            if ((batch / BATCH_SIZE) % 10 === 0) {
                console.log(`  ${end}/${N} words inserted`);
            }
        }

        console.log(`[seed] Inserted ${N} word embeddings`);
    } finally {
        client.release();
    }
}

async function seedAxes() {
    const rawAxes = loadJson<Record<string, any>>('axes.json');
    // Axes file may be wrapped: { version, axes: {...}, coherence_auc, ranges }
    const axesData = rawAxes.axes ?? rawAxes;
    const aucData = rawAxes.coherence_auc ?? rawAxes._auc ?? {};
    const rangesData = rawAxes.ranges ?? rawAxes._ranges ?? {};
    const axisNames = Object.keys(axesData).filter(
        (k) => !['version', '_model', '_dims', '_auc', '_ranges', 'coherence_auc', 'ranges'].includes(k)
    );

    console.log(`[seed] Inserting ${axisNames.length} semantic axes...`);

    const client = await pool.connect();
    try {
        await client.query('DELETE FROM wordle.semantic_axes WHERE lang = $1', [LANG]);

        for (const name of axisNames) {
            const axis = axesData[name];
            if (!axis?.vector) continue;

            const vecStr = `[${axis.vector.join(',')}]`;
            const auc = aucData[name] ?? 0;
            const ranges = rangesData[name];

            await client.query(
                `INSERT INTO wordle.semantic_axes (lang, name, low_anchor, high_anchor, vector, auc, range_p5, range_p95)
                 VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8)
                 ON CONFLICT (lang, name) DO UPDATE SET
                   low_anchor = EXCLUDED.low_anchor,
                   high_anchor = EXCLUDED.high_anchor,
                   vector = EXCLUDED.vector,
                   auc = EXCLUDED.auc,
                   range_p5 = EXCLUDED.range_p5,
                   range_p95 = EXCLUDED.range_p95`,
                [
                    LANG,
                    name,
                    axis.low_anchor,
                    axis.high_anchor,
                    vecStr,
                    auc,
                    ranges?.p5 ?? null,
                    ranges?.p95 ?? null,
                ]
            );
        }

        console.log(`[seed] Inserted ${axisNames.length} axes`);
    } finally {
        client.release();
    }
}

async function seedTargetNeighbors() {
    const { words, embeddings } = loadEmbeddings();
    const targetsRaw = loadJson<{ targets?: string[] } | string[]>('targets.json');
    const targets = Array.isArray(targetsRaw) ? targetsRaw : targetsRaw.targets ?? [];
    const N = words.length;

    // Build word → index map
    const wordIndex = new Map<string, number>();
    for (let i = 0; i < N; i++) wordIndex.set(words[i]!, i);

    console.log(
        `[seed] Computing target neighbors: ${targets.length} targets × top ${TOP_K_NEIGHBORS}...`
    );
    console.log('  (This takes ~30 minutes for 879 targets × 50k vocab)');

    const client = await pool.connect();
    try {
        await client.query('DELETE FROM wordle.target_neighbors WHERE lang = $1', [LANG]);

        for (let t = 0; t < targets.length; t++) {
            const target = targets[t]!;
            const targetIdx = wordIndex.get(target);
            if (targetIdx === undefined) {
                console.warn(`  [skip] target "${target}" not in vocab`);
                continue;
            }

            // Compute cosine to all vocab words
            const cosines = new Float32Array(N);
            for (let i = 0; i < N; i++) {
                let dot = 0;
                for (let j = 0; j < DIMS; j++) {
                    dot +=
                        embeddings[targetIdx * DIMS + j]! *
                        embeddings[i * DIMS + j]!;
                }
                cosines[i] = dot;
            }

            // Get top K indices by cosine (descending)
            const indices = Array.from({ length: N }, (_, i) => i);
            indices.sort((a, b) => cosines[b]! - cosines[a]!);

            // Batch insert top K neighbors
            const k = Math.min(TOP_K_NEIGHBORS, N);
            const batchValues: string[] = [];
            const batchParams: any[] = [];
            let pIdx = 1;

            for (let rank = 0; rank < k; rank++) {
                const idx = indices[rank]!;
                batchValues.push(
                    `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
                );
                batchParams.push(
                    LANG,
                    target,
                    words[idx]!,
                    rank + 1,
                    cosines[idx]!
                );

                // Flush every 1000 rows
                if (batchValues.length >= 1000 || rank === k - 1) {
                    await client.query(
                        `INSERT INTO wordle.target_neighbors (lang, target_word, word, rank, cosine)
                         VALUES ${batchValues.join(', ')}
                         ON CONFLICT (lang, target_word, word) DO NOTHING`,
                        batchParams
                    );
                    batchValues.length = 0;
                    batchParams.length = 0;
                    pIdx = 1;
                }
            }

            if ((t + 1) % 50 === 0 || t === targets.length - 1) {
                console.log(
                    `  ${t + 1}/${targets.length} targets processed`
                );
            }
        }

        console.log(
            `[seed] Inserted ${targets.length * TOP_K_NEIGHBORS} target neighbor rows`
        );
    } finally {
        client.release();
    }
}

async function main() {
    console.log('=== Seeding semantic data into Postgres (pgvector) ===\n');

    const t0 = Date.now();
    await seedWordEmbeddings();
    await seedAxes();
    await seedTargetNeighbors();

    const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
    console.log(`\n=== Seeding complete in ${elapsed} minutes ===`);
    await pool.end();
}

main().catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
});
