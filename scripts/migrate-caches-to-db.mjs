/**
 * Migrate disk-based cache files to Postgres tables.
 *
 * Plain JS version — runs with just `node` (no tsx/esbuild needed).
 * Only dependency: `pg` (production dep, always available).
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 *
 * Usage on Render shell:
 *   node scripts/migrate-caches-to-db.mjs
 *   node scripts/migrate-caches-to-db.mjs --definitions-only
 *   node scripts/migrate-caches-to-db.mjs --stats-only
 *
 * Env vars (auto-set on Render):
 *   DATABASE_URL  — Postgres connection string (required)
 *   BASE_DIR      — Persistent data dir (default: /data)
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}

const BASE_DIR = process.env.BASE_DIR || '/data';
const WORD_DEFS_DIR = join(BASE_DIR, 'word-defs');
const WORD_STATS_DIR = join(BASE_DIR, 'word-stats');
const BATCH_SIZE = 200;

function sanitize(v) { return v != null ? String(v).replace(/\0/g, '') : null; }

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
});

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

async function insertDefinitionBatch(batch) {
    if (!batch.length) return;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const r of batch) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9})`);
        values.push(r.lang, r.word, r.definition, r.definition_native, r.definition_en, r.part_of_speech, r.confidence, r.source, r.url, r.is_negative);
        idx += 10;
    }
    await pool.query(
        `INSERT INTO wordle.definitions (lang, word, definition, definition_native, definition_en, part_of_speech, confidence, source, url, is_negative)
         VALUES ${placeholders.join(',')} ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

async function migrateDefinitions() {
    if (!existsSync(WORD_DEFS_DIR)) { console.log('[definitions] No word-defs dir, skipping'); return; }

    const SKIP = new Set(['wiktionary-exists', 'semantic-embeddings', 'semantic-hints', '.cache']);
    const langs = readdirSync(WORD_DEFS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP.has(d.name))
        .map(d => d.name);

    let total = 0, skipped = 0;
    for (const lang of langs) {
        const langDir = join(WORD_DEFS_DIR, lang);
        const files = readdirSync(langDir).filter(f => f.endsWith('.json'));
        let langCount = 0;
        const batch = [];

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const raw = readFileSync(join(langDir, file), 'utf-8').replace(/\0/g, '');
                const data = JSON.parse(raw);
                batch.push({
                    lang, word,
                    definition: sanitize(data.definition),
                    definition_native: sanitize(data.definition_native),
                    definition_en: sanitize(data.definition_en),
                    part_of_speech: sanitize(data.part_of_speech),
                    confidence: data.confidence ?? null,
                    source: sanitize(data.source),
                    url: sanitize(data.url),
                    is_negative: !!data.not_found,
                });
                if (batch.length >= BATCH_SIZE) {
                    try { await insertDefinitionBatch(batch); langCount += batch.length; } catch (e) { console.warn(`  [batch-err] ${lang}: ${e.message?.slice(0,80)}`); skipped += batch.length; }
                    batch.length = 0;
                }
            } catch { skipped++; }
        }
        if (batch.length) { try { await insertDefinitionBatch(batch); langCount += batch.length; } catch (e) { console.warn(`  [batch-err] ${lang}: ${e.message?.slice(0,80)}`); skipped += batch.length; } batch.length = 0; }
        total += langCount;
        if (langCount > 0) console.log(`  [definitions] ${lang}: ${langCount}`);
    }
    console.log(`[definitions] Total: ${total} migrated, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Word Stats
// ---------------------------------------------------------------------------

async function insertStatsBatch(batch) {
    if (!batch.length) return;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const r of batch) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10})`);
        values.push(r.lang, r.day_idx, r.total, r.wins, r.losses, r.dist_1, r.dist_2, r.dist_3, r.dist_4, r.dist_5, r.dist_6);
        idx += 11;
    }
    await pool.query(
        `INSERT INTO wordle.word_stats (lang, day_idx, total, wins, losses, dist_1, dist_2, dist_3, dist_4, dist_5, dist_6)
         VALUES ${placeholders.join(',')} ON CONFLICT (lang, day_idx) DO NOTHING`,
        values
    );
}

async function migrateWordStats() {
    if (!existsSync(WORD_STATS_DIR)) { console.log('[word-stats] No word-stats dir, skipping'); return; }

    const langs = readdirSync(WORD_STATS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

    let total = 0, skipped = 0;
    for (const lang of langs) {
        const langDir = join(WORD_STATS_DIR, lang);
        const files = readdirSync(langDir).filter(f => f.endsWith('.json'));
        const batch = [];

        for (const file of files) {
            const dayIdx = parseInt(file.replace('.json', ''), 10);
            if (isNaN(dayIdx)) continue;
            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                if (!data.total) continue;
                batch.push({
                    lang, day_idx: dayIdx,
                    total: data.total ?? 0, wins: data.wins ?? 0, losses: data.losses ?? 0,
                    dist_1: data.distribution?.['1'] ?? 0, dist_2: data.distribution?.['2'] ?? 0,
                    dist_3: data.distribution?.['3'] ?? 0, dist_4: data.distribution?.['4'] ?? 0,
                    dist_5: data.distribution?.['5'] ?? 0, dist_6: data.distribution?.['6'] ?? 0,
                });
                if (batch.length >= BATCH_SIZE) { await insertStatsBatch(batch); total += batch.length; batch.length = 0; }
            } catch { skipped++; }
        }
        if (batch.length) { await insertStatsBatch(batch); total += batch.length; batch.length = 0; }
    }
    console.log(`[word-stats] Total: ${total} migrated, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Wiktionary
// ---------------------------------------------------------------------------

async function insertWiktionaryBatch(batch) {
    if (!batch.length) return;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const r of batch) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2})`);
        values.push(r.lang, r.word, r.exists);
        idx += 3;
    }
    await pool.query(
        `INSERT INTO wordle.wiktionary_cache (lang, word, exists)
         VALUES ${placeholders.join(',')} ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

async function migrateWiktionary() {
    const wiktDir = join(WORD_DEFS_DIR, 'wiktionary-exists');
    if (!existsSync(wiktDir)) { console.log('[wiktionary] No wiktionary-exists dir, skipping'); return; }

    const langs = readdirSync(wiktDir, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

    let total = 0, skipped = 0;
    for (const lang of langs) {
        const langDir = join(wiktDir, lang);
        const files = readdirSync(langDir).filter(f => f.endsWith('.json'));
        const batch = [];

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                batch.push({ lang, word, exists: !!data.exists });
                if (batch.length >= BATCH_SIZE) { await insertWiktionaryBatch(batch); total += batch.length; batch.length = 0; }
            } catch { skipped++; }
        }
        if (batch.length) { await insertWiktionaryBatch(batch); total += batch.length; batch.length = 0; }
    }
    console.log(`[wiktionary] Total: ${total} migrated, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Semantic Hints
// ---------------------------------------------------------------------------

async function insertHintsBatch(batch) {
    if (!batch.length) return;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const r of batch) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3})`);
        values.push(r.lang, r.word, r.hint, r.model);
        idx += 4;
    }
    await pool.query(
        `INSERT INTO wordle.semantic_hints (lang, word, hint, model)
         VALUES ${placeholders.join(',')} ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

async function migrateSemanticHints() {
    const hintsDir = join(WORD_DEFS_DIR, 'semantic-hints');
    if (!existsSync(hintsDir)) { console.log('[semantic-hints] No hints dir, skipping'); return; }

    const files = readdirSync(hintsDir).filter(f => f.endsWith('.json'));
    let total = 0, skipped = 0;
    const batch = [];

    for (const file of files) {
        const word = file.replace('.json', '');
        try {
            const data = JSON.parse(readFileSync(join(hintsDir, file), 'utf-8'));
            if (!data.hint) continue;
            batch.push({ lang: 'en', word, hint: data.hint, model: data.model ?? null });
            if (batch.length >= BATCH_SIZE) { await insertHintsBatch(batch); total += batch.length; batch.length = 0; }
        } catch { skipped++; }
    }
    if (batch.length) { await insertHintsBatch(batch); total += batch.length; }
    console.log(`[semantic-hints] Total: ${total} migrated, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);
    const runAll = args.length === 0;

    console.log('=== Migrating disk caches to Postgres ===');
    console.log(`BASE_DIR: ${BASE_DIR}`);
    console.log(`BATCH_SIZE: ${BATCH_SIZE}\n`);

    try {
        await pool.query('SELECT 1');
        console.log('[db] Connected\n');
    } catch (e) {
        console.error('[db] Connection failed:', e);
        process.exit(1);
    }

    if (runAll || args.includes('--definitions-only')) {
        const t0 = Date.now();
        await migrateDefinitions();
        console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }
    if (runAll || args.includes('--stats-only')) {
        const t0 = Date.now();
        await migrateWordStats();
        console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }
    if (runAll || args.includes('--wiktionary-only')) {
        const t0 = Date.now();
        await migrateWiktionary();
        console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }
    if (runAll || args.includes('--hints-only')) {
        const t0 = Date.now();
        await migrateSemanticHints();
        console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
    }

    console.log('=== Migration complete ===');
    await pool.end();
}

main().catch(e => { console.error('Migration failed:', e); process.exit(1); });
