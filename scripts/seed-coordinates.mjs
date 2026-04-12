/**
 * Seed UMAP and PCA2D coordinates into word_embeddings table.
 * Reads from data/semantic/umap.json and pca2d.json.
 *
 * Usage: node scripts/seed-coordinates.mjs
 * Env: DATABASE_URL, SEMANTIC_DIR (default: data/semantic)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const SEMANTIC_DIR = process.env.SEMANTIC_DIR || join(process.cwd(), 'data', 'semantic');
const BATCH_SIZE = 500;

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function main() {
    await pool.query('SELECT 1');
    console.log('[db] Connected');

    // Load coordinate files
    const umap = JSON.parse(readFileSync(join(SEMANTIC_DIR, 'umap.json'), 'utf-8')).coordinates;
    const pca = JSON.parse(readFileSync(join(SEMANTIC_DIR, 'pca2d.json'), 'utf-8')).coordinates;
    console.log(`[umap] ${Object.keys(umap).length} words`);
    console.log(`[pca2d] ${Object.keys(pca).length} words`);

    // Merge into one update set
    const allWords = new Set([...Object.keys(umap), ...Object.keys(pca)]);
    console.log(`[total] ${allWords.size} unique words to update\n`);

    let updated = 0, skipped = 0;
    const batch = [];

    for (const word of allWords) {
        const u = umap[word];
        const p = pca[word];
        batch.push({
            word,
            umap_x: u ? u[0] : null,
            umap_y: u ? u[1] : null,
            pca2d_x: p ? p[0] : null,
            pca2d_y: p ? p[1] : null,
        });

        if (batch.length >= BATCH_SIZE) {
            const n = await flushBatch(batch);
            updated += n;
            skipped += batch.length - n;
            batch.length = 0;
            if (updated % 10000 < BATCH_SIZE) process.stdout.write(`  ${updated} updated...\r`);
        }
    }
    if (batch.length) {
        const n = await flushBatch(batch);
        updated += n;
        skipped += batch.length - n;
    }

    console.log(`\n[done] ${updated} updated, ${skipped} skipped (not in DB)`);
    await pool.end();
}

async function flushBatch(batch) {
    // Use a CTE with VALUES to batch-update
    const values = [];
    const rows = [];
    let idx = 1;
    for (const r of batch) {
        rows.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4})`);
        values.push(r.word, r.umap_x, r.umap_y, r.pca2d_x, r.pca2d_y);
        idx += 5;
    }

    const result = await pool.query(`
        UPDATE wordle.word_embeddings AS we SET
            umap_x = v.umap_x::double precision,
            umap_y = v.umap_y::double precision,
            pca2d_x = v.pca2d_x::double precision,
            pca2d_y = v.pca2d_y::double precision
        FROM (VALUES ${rows.join(',')}) AS v(word, umap_x, umap_y, pca2d_x, pca2d_y)
        WHERE we.lang = 'en' AND we.word = v.word
    `, values);

    return result.rowCount;
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
