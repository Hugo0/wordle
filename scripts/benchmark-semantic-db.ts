/**
 * Benchmark pgvector semantic operations against the live database.
 *
 * Reports p50/p95/p99 latencies for the hot-path operations:
 *   - computeGuessRank (btree lookup on target_neighbors)
 *   - knnNearest (pgvector HNSW index)
 *   - getEmbedding (single vector fetch)
 *   - get2dPosition (coordinate lookup)
 *
 * Usage: DATABASE_URL="..." npx tsx scripts/benchmark-semantic-db.ts
 */

import pg from 'pg';
import Prisma from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { PrismaClient } = Prisma;

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

async function benchmark(name: string, fn: () => Promise<void>, iterations: number = 100) {
    // Warm up
    for (let i = 0; i < 5; i++) await fn();

    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        await fn();
        times.push(performance.now() - t0);
    }

    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)]!;
    const p95 = times[Math.floor(times.length * 0.95)]!;
    const p99 = times[Math.floor(times.length * 0.99)]!;
    const avg = times.reduce((s, t) => s + t, 0) / times.length;

    console.log(
        `  ${name.padEnd(25)} avg=${avg.toFixed(1)}ms  p50=${p50.toFixed(1)}ms  p95=${p95.toFixed(1)}ms  p99=${p99.toFixed(1)}ms`
    );
}

async function main() {
    const client = await pool.connect();

    console.log('=== Semantic DB Benchmark ===\n');

    // 1. computeGuessRank — btree lookup
    await benchmark('computeGuessRank (hit)', async () => {
        await client.query(
            'SELECT rank FROM wordle.target_neighbors WHERE lang = $1 AND target_word = $2 AND word = $3',
            ['en', 'bread', 'loaf']
        );
    });

    await benchmark('computeGuessRank (miss)', async () => {
        await client.query(
            'SELECT rank FROM wordle.target_neighbors WHERE lang = $1 AND target_word = $2 AND word = $3',
            ['en', 'bread', 'quantum']
        );
    });

    // 2. getEmbedding — single vector fetch
    await benchmark('getEmbedding', async () => {
        await client.query(
            'SELECT embedding::text FROM wordle.word_embeddings WHERE lang = $1 AND word = $2',
            ['en', 'bread']
        );
    });

    // 3. get2dPosition — coordinate lookup
    await benchmark('get2dPosition', async () => {
        await client.query(
            'SELECT umap_x, umap_y FROM wordle.word_embeddings WHERE lang = $1 AND word = $2',
            ['en', 'bread']
        );
    });

    // 4. knnNearest — pgvector HNSW
    // First get bread's embedding for the kNN query
    const embResult = await client.query(
        'SELECT embedding::text FROM wordle.word_embeddings WHERE lang = $1 AND word = $2',
        ['en', 'bread']
    );
    const breadVec = embResult.rows[0]?.embedding;
    if (breadVec) {
        await benchmark('knnNearest (k=8)', async () => {
            await client.query(
                `SELECT word, 1 - (embedding <=> $1::vector) as similarity
                 FROM wordle.word_embeddings
                 WHERE lang = 'en' AND is_vocab = true
                 ORDER BY embedding <=> $1::vector
                 LIMIT 8`,
                [breadVec]
            );
        }, 50);

        await benchmark('knnNearest (k=20)', async () => {
            await client.query(
                `SELECT word, 1 - (embedding <=> $1::vector) as similarity
                 FROM wordle.word_embeddings
                 WHERE lang = 'en' AND is_vocab = true
                 ORDER BY embedding <=> $1::vector
                 LIMIT 20`,
                [breadVec]
            );
        }, 50);
    }

    // 5. COUNT(*) for totalRanked
    await benchmark('totalRanked COUNT', async () => {
        await client.query(
            'SELECT COUNT(*) FROM wordle.word_embeddings WHERE lang = $1 AND is_vocab = true',
            ['en']
        );
    }, 20);

    // 6. Combined guess simulation (rank + umap + total — parallel)
    await benchmark('full guess (parallel)', async () => {
        await Promise.all([
            client.query(
                'SELECT rank FROM wordle.target_neighbors WHERE lang = $1 AND target_word = $2 AND word = $3',
                ['en', 'bread', 'loaf']
            ),
            client.query(
                'SELECT umap_x, umap_y FROM wordle.word_embeddings WHERE lang = $1 AND word = $2',
                ['en', 'loaf']
            ),
        ]);
    });

    console.log('\n=== Benchmark complete ===');
    client.release();
    await pool.end();
}

main().catch((e) => {
    console.error('Benchmark failed:', e);
    process.exit(1);
});
