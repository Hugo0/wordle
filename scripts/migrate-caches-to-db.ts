/**
 * Migrate disk-based cache files to Postgres tables.
 *
 * Reads JSON cache files (definitions, word stats, wiktionary, hints)
 * from the persistent disk and batch-inserts them into Postgres.
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 *
 * Usage:
 *   BASE_DIR=/data npx tsx scripts/migrate-caches-to-db.ts
 *   BASE_DIR=/data npx tsx scripts/migrate-caches-to-db.ts --definitions-only
 *   BASE_DIR=/data npx tsx scripts/migrate-caches-to-db.ts --stats-only
 *
 * Env vars:
 *   DATABASE_URL  — Postgres connection string (required)
 *   BASE_DIR      — Path to persistent data directory (default: /data)
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

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
});

// ---------------------------------------------------------------------------
// Definitions: word-defs/{lang}/{word}.json → definitions table
// ---------------------------------------------------------------------------

async function migrateDefinitions() {
    if (!existsSync(WORD_DEFS_DIR)) {
        console.log('[definitions] No word-defs directory found, skipping');
        return;
    }

    const SKIP_DIRS = new Set([
        'wiktionary-exists',
        'semantic-embeddings',
        'semantic-hints',
        '.cache',
    ]);

    const langs = readdirSync(WORD_DEFS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
        .map((d) => d.name);

    let total = 0;
    let skipped = 0;

    for (const lang of langs) {
        const langDir = join(WORD_DEFS_DIR, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));
        let langCount = 0;

        const batch: Array<{
            lang: string;
            word: string;
            definition: string | null;
            definition_native: string | null;
            definition_en: string | null;
            part_of_speech: string | null;
            confidence: number | null;
            source: string | null;
            url: string | null;
            is_negative: boolean;
        }> = [];

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const raw = readFileSync(join(langDir, file), 'utf-8');
                const data = JSON.parse(raw);
                const isNeg = !!data.not_found;

                batch.push({
                    lang,
                    word,
                    definition: data.definition ?? null,
                    definition_native: data.definition_native ?? null,
                    definition_en: data.definition_en ?? null,
                    part_of_speech: data.part_of_speech ?? null,
                    confidence: data.confidence ?? null,
                    source: data.source ?? null,
                    url: data.url ?? null,
                    is_negative: isNeg,
                });

                if (batch.length >= BATCH_SIZE) {
                    await insertDefinitionBatch(batch);
                    langCount += batch.length;
                    batch.length = 0;
                }
            } catch {
                skipped++;
            }
        }

        if (batch.length > 0) {
            await insertDefinitionBatch(batch);
            langCount += batch.length;
            batch.length = 0;
        }

        total += langCount;
        if (langCount > 0) {
            console.log(`  [definitions] ${lang}: ${langCount} entries`);
        }
    }

    console.log(`[definitions] Total: ${total} migrated, ${skipped} skipped\n`);
}

async function insertDefinitionBatch(
    batch: Array<{
        lang: string;
        word: string;
        definition: string | null;
        definition_native: string | null;
        definition_en: string | null;
        part_of_speech: string | null;
        confidence: number | null;
        source: string | null;
        url: string | null;
        is_negative: boolean;
    }>
) {
    if (batch.length === 0) return;

    // Build multi-value INSERT with ON CONFLICT DO NOTHING
    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const row of batch) {
        placeholders.push(
            `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9})`
        );
        values.push(
            row.lang,
            row.word,
            row.definition,
            row.definition_native,
            row.definition_en,
            row.part_of_speech,
            row.confidence,
            row.source,
            row.url,
            row.is_negative
        );
        idx += 10;
    }

    await pool.query(
        `INSERT INTO wordle.definitions (lang, word, definition, definition_native, definition_en, part_of_speech, confidence, source, url, is_negative)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

// ---------------------------------------------------------------------------
// Word Stats: word-stats/{lang}/{dayIdx}.json → word_stats table
// ---------------------------------------------------------------------------

async function migrateWordStats() {
    if (!existsSync(WORD_STATS_DIR)) {
        console.log('[word-stats] No word-stats directory found, skipping');
        return;
    }

    const langs = readdirSync(WORD_STATS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    let total = 0;
    let skipped = 0;

    for (const lang of langs) {
        const langDir = join(WORD_STATS_DIR, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

        const batch: Array<{
            lang: string;
            day_idx: number;
            total: number;
            wins: number;
            losses: number;
            dist_1: number;
            dist_2: number;
            dist_3: number;
            dist_4: number;
            dist_5: number;
            dist_6: number;
        }> = [];

        for (const file of files) {
            const dayIdx = parseInt(file.replace('.json', ''), 10);
            if (isNaN(dayIdx)) continue;

            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                if (!data.total) continue;

                batch.push({
                    lang,
                    day_idx: dayIdx,
                    total: data.total ?? 0,
                    wins: data.wins ?? 0,
                    losses: data.losses ?? 0,
                    dist_1: data.distribution?.['1'] ?? 0,
                    dist_2: data.distribution?.['2'] ?? 0,
                    dist_3: data.distribution?.['3'] ?? 0,
                    dist_4: data.distribution?.['4'] ?? 0,
                    dist_5: data.distribution?.['5'] ?? 0,
                    dist_6: data.distribution?.['6'] ?? 0,
                });

                if (batch.length >= BATCH_SIZE) {
                    await insertStatsBatch(batch);
                    total += batch.length;
                    batch.length = 0;
                }
            } catch {
                skipped++;
            }
        }

        if (batch.length > 0) {
            await insertStatsBatch(batch);
            total += batch.length;
            batch.length = 0;
        }
    }

    console.log(`[word-stats] Total: ${total} migrated, ${skipped} skipped\n`);
}

async function insertStatsBatch(
    batch: Array<{
        lang: string;
        day_idx: number;
        total: number;
        wins: number;
        losses: number;
        dist_1: number;
        dist_2: number;
        dist_3: number;
        dist_4: number;
        dist_5: number;
        dist_6: number;
    }>
) {
    if (batch.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const row of batch) {
        placeholders.push(
            `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10})`
        );
        values.push(
            row.lang,
            row.day_idx,
            row.total,
            row.wins,
            row.losses,
            row.dist_1,
            row.dist_2,
            row.dist_3,
            row.dist_4,
            row.dist_5,
            row.dist_6
        );
        idx += 11;
    }

    await pool.query(
        `INSERT INTO wordle.word_stats (lang, day_idx, total, wins, losses, dist_1, dist_2, dist_3, dist_4, dist_5, dist_6)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (lang, day_idx) DO NOTHING`,
        values
    );
}

// ---------------------------------------------------------------------------
// Wiktionary: word-defs/wiktionary-exists/{lang}/{word}.json → wiktionary_cache
// ---------------------------------------------------------------------------

async function migrateWiktionary() {
    const wiktDir = join(WORD_DEFS_DIR, 'wiktionary-exists');
    if (!existsSync(wiktDir)) {
        console.log('[wiktionary] No wiktionary-exists directory found, skipping');
        return;
    }

    const langs = readdirSync(wiktDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    let total = 0;
    let skipped = 0;

    for (const lang of langs) {
        const langDir = join(wiktDir, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

        const batch: Array<{ lang: string; word: string; exists: boolean }> = [];

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                batch.push({ lang, word, exists: !!data.exists });

                if (batch.length >= BATCH_SIZE) {
                    await insertWiktionaryBatch(batch);
                    total += batch.length;
                    batch.length = 0;
                }
            } catch {
                skipped++;
            }
        }

        if (batch.length > 0) {
            await insertWiktionaryBatch(batch);
            total += batch.length;
            batch.length = 0;
        }
    }

    console.log(`[wiktionary] Total: ${total} migrated, ${skipped} skipped\n`);
}

async function insertWiktionaryBatch(
    batch: Array<{ lang: string; word: string; exists: boolean }>
) {
    if (batch.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const row of batch) {
        placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
        values.push(row.lang, row.word, row.exists);
        idx += 3;
    }

    await pool.query(
        `INSERT INTO wordle.wiktionary_cache (lang, word, exists)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

// ---------------------------------------------------------------------------
// Semantic Hints: word-defs/semantic-hints/{word}.json → semantic_hints
// ---------------------------------------------------------------------------

async function migrateSemanticHints() {
    const hintsDir = join(WORD_DEFS_DIR, 'semantic-hints');
    if (!existsSync(hintsDir)) {
        console.log('[semantic-hints] No hints directory found, skipping');
        return;
    }

    const files = readdirSync(hintsDir).filter((f) => f.endsWith('.json'));
    let total = 0;
    let skipped = 0;

    const batch: Array<{ lang: string; word: string; hint: string; model: string | null }> = [];

    for (const file of files) {
        const word = file.replace('.json', '');
        try {
            const data = JSON.parse(readFileSync(join(hintsDir, file), 'utf-8'));
            if (!data.hint) continue;

            batch.push({ lang: 'en', word, hint: data.hint, model: data.model ?? null });

            if (batch.length >= BATCH_SIZE) {
                await insertHintsBatch(batch);
                total += batch.length;
                batch.length = 0;
            }
        } catch {
            skipped++;
        }
    }

    if (batch.length > 0) {
        await insertHintsBatch(batch);
        total += batch.length;
    }

    console.log(`[semantic-hints] Total: ${total} migrated, ${skipped} skipped\n`);
}

async function insertHintsBatch(
    batch: Array<{ lang: string; word: string; hint: string; model: string | null }>
) {
    if (batch.length === 0) return;

    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const row of batch) {
        placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
        values.push(row.lang, row.word, row.hint, row.model);
        idx += 4;
    }

    await pool.query(
        `INSERT INTO wordle.semantic_hints (lang, word, hint, model)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);
    const runAll = args.length === 0;

    console.log(`=== Migrating disk caches to Postgres ===`);
    console.log(`BASE_DIR: ${BASE_DIR}`);
    console.log(`BATCH_SIZE: ${BATCH_SIZE}\n`);

    // Verify DB connection
    try {
        const { rows } = await pool.query('SELECT 1');
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

main().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
