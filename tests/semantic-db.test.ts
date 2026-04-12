/**
 * Tests for server/utils/semantic-db.ts
 *
 * Validates pgvector-backed semantic operations against the seeded
 * production database. Requires DATABASE_URL to be set.
 *
 * These tests verify correctness of:
 * - Embedding lookup (word exists, returns correct dimensions)
 * - Rank computation via target_neighbors table
 * - kNN nearest neighbor search
 * - 2D position lookup (UMAP/PCA2D)
 * - Axis loading
 * - getTotalRanked caching
 */
import { describe, it, expect } from 'vitest';

// Skip all tests if DATABASE_URL is not set
const DB_URL = process.env.DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

describeDb('semantic-db (requires DATABASE_URL)', () => {
    it('exports all expected functions', async () => {
        const mod = await import('../server/utils/_semantic-db');
        expect(typeof mod.getEmbedding).toBe('function');
        expect(typeof mod.get2dPosition).toBe('function');
        expect(typeof mod.computeGuessRank).toBe('function');
        expect(typeof mod.getTotalRanked).toBe('function');
        expect(typeof mod.knnNearest).toBe('function');
        expect(typeof mod.loadAxes).toBe('function');
        expect(typeof mod.getCachedAxesVectors).toBe('function');
        expect(typeof mod.getCachedAxesNames).toBe('function');
        expect(typeof mod.storeOnDemandEmbedding).toBe('function');
        expect(typeof mod.getTargets).toBe('function');
        expect(typeof mod.wordExists).toBe('function');
    });

    it('getEmbedding returns 512-dim Float32Array for known word', async () => {
        const { getEmbedding } = await import('../server/utils/_semantic-db');
        const vec = await getEmbedding('en', 'bread');
        expect(vec).not.toBeNull();
        expect(vec!.length).toBe(512);
        expect(vec instanceof Float32Array).toBe(true);
        // Vector should be L2-normalized (magnitude ≈ 1)
        let norm = 0;
        for (let i = 0; i < vec!.length; i++) norm += vec![i]! * vec![i]!;
        expect(Math.abs(Math.sqrt(norm) - 1)).toBeLessThan(0.01);
    });

    it('getEmbedding returns null for unknown word', async () => {
        const { getEmbedding } = await import('../server/utils/_semantic-db');
        const vec = await getEmbedding('en', 'xyzzy_nonexistent_word_12345');
        expect(vec).toBeNull();
    });

    it('computeGuessRank returns 1 for target itself', async () => {
        const { computeGuessRank } = await import('../server/utils/_semantic-db');
        const rank = await computeGuessRank('en', 'bread', 'bread');
        expect(rank).toBe(1);
    });

    it('computeGuessRank returns low rank for semantically close word', async () => {
        const { computeGuessRank } = await import('../server/utils/_semantic-db');
        // "loaf" should be close to "bread"
        const rank = await computeGuessRank('en', 'bread', 'loaf');
        expect(rank).not.toBeNull();
        expect(rank!).toBeLessThan(50); // should be in top 50 neighbors
    });

    it('computeGuessRank returns high rank for unrelated word', async () => {
        const { computeGuessRank } = await import('../server/utils/_semantic-db');
        // "quantum" should be far from "bread"
        const rank = await computeGuessRank('en', 'bread', 'quantum');
        expect(rank).not.toBeNull();
        expect(rank!).toBeGreaterThan(1000);
    });

    it('getTotalRanked returns ~50k for English', async () => {
        const { getTotalRanked } = await import('../server/utils/_semantic-db');
        const total = await getTotalRanked('en');
        expect(total).toBeGreaterThan(40000);
        expect(total).toBeLessThan(60000);
    });

    it('getTotalRanked is cached (second call instant)', async () => {
        const { getTotalRanked } = await import('../server/utils/_semantic-db');
        const t0 = Date.now();
        await getTotalRanked('en');
        const first = Date.now() - t0;

        const t1 = Date.now();
        await getTotalRanked('en');
        const second = Date.now() - t1;

        // Second call should be <1ms (cached), first might be 5-50ms (DB)
        expect(second).toBeLessThan(Math.max(first, 5));
    });

    it('get2dPosition returns coordinates for known word', async () => {
        const { get2dPosition } = await import('../server/utils/_semantic-db');
        const pos = await get2dPosition('en', 'bread');
        expect(pos).not.toBeNull();
        expect(pos!.length).toBe(2);
        expect(typeof pos![0]).toBe('number');
        expect(typeof pos![1]).toBe('number');
    });

    it('knnNearest returns k neighbors', async () => {
        const { knnNearest } = await import('../server/utils/_semantic-db');
        const neighbors = await knnNearest('en', 'bread', 5);
        expect(neighbors.length).toBe(5);
        // Neighbors should have word and similarity fields
        for (const n of neighbors) {
            expect(typeof n.word).toBe('string');
            expect(typeof n.similarity).toBe('number');
            expect(n.similarity).toBeGreaterThan(0);
            expect(n.similarity).toBeLessThanOrEqual(1);
        }
        // First neighbor should be most similar
        expect(neighbors[0]!.similarity).toBeGreaterThanOrEqual(
            neighbors[neighbors.length - 1]!.similarity
        );
    });

    it('knnNearest respects exclude list', async () => {
        const { knnNearest } = await import('../server/utils/_semantic-db');
        const all = await knnNearest('en', 'bread', 5);
        const excluded = await knnNearest('en', 'bread', 5, [all[0]!.word]);
        // The excluded word should not appear in the results
        expect(excluded.every((n) => n.word !== all[0]!.word)).toBe(true);
    });

    it('loadAxes returns axis data with vectors', async () => {
        const { loadAxes } = await import('../server/utils/_semantic-db');
        const axes = await loadAxes('en');
        expect(axes.length).toBeGreaterThan(0);
        for (const axis of axes) {
            expect(typeof axis.name).toBe('string');
            expect(typeof axis.lowAnchor).toBe('string');
            expect(typeof axis.highAnchor).toBe('string');
            expect(axis.vector instanceof Float32Array).toBe(true);
            expect(axis.vector.length).toBe(512);
        }
    });

    it('getCachedAxesVectors returns after loadAxes', async () => {
        const { loadAxes, getCachedAxesVectors, getCachedAxesNames } =
            await import('../server/utils/_semantic-db');
        await loadAxes('en');
        const vecs = getCachedAxesVectors();
        const names = getCachedAxesNames();
        expect(vecs).not.toBeNull();
        expect(names.length).toBeGreaterThan(0);
        expect(vecs!.length).toBe(names.length * 512);
    });

    it('getTargets returns target words', async () => {
        const { getTargets } = await import('../server/utils/_semantic-db');
        const targets = await getTargets('en');
        expect(targets.length).toBeGreaterThan(800);
        expect(targets).toContain('bread'); // bread is a known target
    });

    it('wordExists returns true for vocab word', async () => {
        const { wordExists } = await import('../server/utils/_semantic-db');
        expect(await wordExists('en', 'bread')).toBe(true);
    });

    it('wordExists returns false for unknown word', async () => {
        const { wordExists } = await import('../server/utils/_semantic-db');
        expect(await wordExists('en', 'xyzzy_nonexistent_12345')).toBe(false);
    });
});
