/**
 * Migrate disk-based cache files to Postgres tables.
 *
 * Reads all existing JSON cache files (definitions, word stats,
 * wiktionary existence, semantic hints) and batch-inserts them
 * into the corresponding Postgres tables.
 *
 * Safe to run multiple times — uses upsert (ON CONFLICT DO NOTHING).
 *
 * Usage: npx tsx scripts/migrate-caches-to-db.ts
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
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
});
const adapter = new PrismaPg(pool, { schema: 'wordle' });
const prisma = new PrismaClient({ adapter });

const WORD_DEFS_DIR = join(process.cwd(), 'word-defs');
const WORD_STATS_DIR = join(process.cwd(), 'word-stats');

async function migrateDefinitions() {
    const baseDir = WORD_DEFS_DIR;
    if (!existsSync(baseDir)) {
        console.log('[definitions] No word-defs directory found, skipping');
        return;
    }

    let count = 0;
    const langs = readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'wiktionary-exists' && d.name !== 'semantic-embeddings' && d.name !== 'semantic-hints')
        .map((d) => d.name);

    for (const lang of langs) {
        const langDir = join(baseDir, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                const isNeg = !!data.not_found;

                await prisma.definition.upsert({
                    where: { lang_word: { lang, word } },
                    create: {
                        lang,
                        word,
                        definition: data.definition ?? null,
                        definitionNative: data.definition_native ?? null,
                        definitionEn: data.definition_en ?? null,
                        partOfSpeech: data.part_of_speech ?? null,
                        confidence: data.confidence ?? null,
                        source: data.source ?? null,
                        url: data.url ?? null,
                        isNegative: isNeg,
                    },
                    update: {},
                });
                count++;
            } catch (e) {
                console.warn(`  [skip] ${lang}/${file}:`, (e as Error).message);
            }
        }
    }
    console.log(`[definitions] Migrated ${count} entries`);
}

async function migrateWordStats() {
    if (!existsSync(WORD_STATS_DIR)) {
        console.log('[word-stats] No word-stats directory found, skipping');
        return;
    }

    let count = 0;
    const langs = readdirSync(WORD_STATS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    for (const lang of langs) {
        const langDir = join(WORD_STATS_DIR, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

        for (const file of files) {
            const dayIdx = parseInt(file.replace('.json', ''), 10);
            if (isNaN(dayIdx)) continue;

            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));
                if (!data.total) continue;

                await prisma.wordStat.upsert({
                    where: { lang_dayIdx: { lang, dayIdx } },
                    create: {
                        lang,
                        dayIdx,
                        total: data.total ?? 0,
                        wins: data.wins ?? 0,
                        losses: data.losses ?? 0,
                        dist1: data.distribution?.['1'] ?? 0,
                        dist2: data.distribution?.['2'] ?? 0,
                        dist3: data.distribution?.['3'] ?? 0,
                        dist4: data.distribution?.['4'] ?? 0,
                        dist5: data.distribution?.['5'] ?? 0,
                        dist6: data.distribution?.['6'] ?? 0,
                    },
                    update: {},
                });
                count++;
            } catch (e) {
                console.warn(`  [skip] ${lang}/${file}:`, (e as Error).message);
            }
        }
    }
    console.log(`[word-stats] Migrated ${count} entries`);
}

async function migrateWiktionary() {
    const wiktDir = join(WORD_DEFS_DIR, 'wiktionary-exists');
    if (!existsSync(wiktDir)) {
        console.log('[wiktionary] No wiktionary-exists directory found, skipping');
        return;
    }

    let count = 0;
    const langs = readdirSync(wiktDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

    for (const lang of langs) {
        const langDir = join(wiktDir, lang);
        const files = readdirSync(langDir).filter((f) => f.endsWith('.json'));

        for (const file of files) {
            const word = file.replace('.json', '');
            try {
                const data = JSON.parse(readFileSync(join(langDir, file), 'utf-8'));

                await prisma.wiktionaryCache.upsert({
                    where: { lang_word: { lang, word } },
                    create: { lang, word, exists: !!data.exists },
                    update: {},
                });
                count++;
            } catch (e) {
                console.warn(`  [skip] ${lang}/${file}:`, (e as Error).message);
            }
        }
    }
    console.log(`[wiktionary] Migrated ${count} entries`);
}

async function migrateSemanticHints() {
    const hintsDir = join(WORD_DEFS_DIR, 'semantic-hints');
    if (!existsSync(hintsDir)) {
        console.log('[semantic-hints] No hints directory found, skipping');
        return;
    }

    let count = 0;
    const files = readdirSync(hintsDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
        const word = file.replace('.json', '');
        try {
            const data = JSON.parse(readFileSync(join(hintsDir, file), 'utf-8'));
            if (!data.hint) continue;

            await prisma.semanticHint.upsert({
                where: { lang_word: { lang: 'en', word } },
                create: { lang: 'en', word, hint: data.hint, model: data.model },
                update: {},
            });
            count++;
        } catch (e) {
            console.warn(`  [skip] ${file}:`, (e as Error).message);
        }
    }
    console.log(`[semantic-hints] Migrated ${count} entries`);
}

async function main() {
    console.log('=== Migrating disk caches to Postgres ===\n');

    await migrateDefinitions();
    await migrateWordStats();
    await migrateWiktionary();
    await migrateSemanticHints();

    console.log('\n=== Migration complete ===');
    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
