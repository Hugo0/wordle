/**
 * Seed kaikki (offline Wiktionary) definitions into the definitions table.
 *
 * These are static, pre-built definitions that serve as the Tier 3 fallback
 * when LLM definitions fail. Seeding them into the DB eliminates the need
 * for a separate in-memory cache that grows to 100MB.
 *
 * Files: data/definitions/{lang}.json (native) and {lang}_en.json (English)
 * Format: { "word": "definition string", ... }
 *
 * Inserts with source='kaikki' or 'kaikki-en'. Uses ON CONFLICT DO NOTHING
 * so LLM definitions (higher quality) aren't overwritten.
 *
 * Usage: node scripts/seed-kaikki-to-db.mjs
 * Env: DATABASE_URL
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const DEFS_DIR = process.env.DEFS_DIR || join(process.cwd(), 'data', 'definitions');
const BATCH_SIZE = 500;

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function insertBatch(batch) {
    if (!batch.length) return;
    const values = [];
    const placeholders = [];
    let idx = 1;
    for (const r of batch) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5})`);
        values.push(r.lang, r.word, r.definition, r.definition_en, r.source, r.url);
        idx += 6;
    }
    await pool.query(
        `INSERT INTO wordle.definitions (lang, word, definition, definition_en, source, url)
         VALUES ${placeholders.join(',')}
         ON CONFLICT (lang, word) DO NOTHING`,
        values
    );
}

function wiktionaryUrl(word, langCode) {
    // Simplified — matches the app's logic
    const wiktLangs = { en: 'en', fi: 'fi', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', nl: 'nl', sv: 'sv', nb: 'no', nn: 'nn', da: 'da', pl: 'pl', ru: 'ru', uk: 'uk', bg: 'bg', hr: 'hr', sr: 'sr', sl: 'sl', cs: 'cs', sk: 'sk', ro: 'ro', hu: 'hu', tr: 'tr', az: 'az', et: 'et', lt: 'lt', lv: 'lv', el: 'el', ka: 'ka', hy: 'hy', he: 'he', ar: 'ar', fa: 'fa', vi: 'vi', id: 'id', ms: 'ms', ca: 'ca', gl: 'gl', eu: 'eu', br: 'br', oc: 'oc', la: 'la', ko: 'ko', sq: 'sq', mk: 'mk', is: 'is', ga: 'ga', cy: 'cy', mt: 'mt', eo: 'eo', ja: 'ja' };
    const wl = wiktLangs[langCode] || 'en';
    return `https://${wl}.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}

async function main() {
    await pool.query('SELECT 1');
    console.log('[db] Connected\n');

    const files = readdirSync(DEFS_DIR).filter(f => f.endsWith('.json'));
    let totalNative = 0, totalEn = 0;

    for (const file of files) {
        const isEn = file.endsWith('_en.json');
        const langCode = isEn ? file.replace('_en.json', '') : file.replace('.json', '');
        const source = isEn ? 'kaikki-en' : 'kaikki';

        const data = JSON.parse(readFileSync(join(DEFS_DIR, file), 'utf-8'));
        const words = Object.keys(data);
        const batch = [];

        for (const word of words) {
            const def = (data[word] || '').replace(/\0/g, '');
            if (!def) continue;

            batch.push({
                lang: langCode,
                word: word.toLowerCase(),
                definition: isEn ? null : def,
                definition_en: isEn ? def : null,
                source,
                url: wiktionaryUrl(word, langCode),
            });

            if (batch.length >= BATCH_SIZE) {
                await insertBatch(batch);
                if (isEn) totalEn += batch.length; else totalNative += batch.length;
                batch.length = 0;
            }
        }
        if (batch.length) {
            await insertBatch(batch);
            if (isEn) totalEn += batch.length; else totalNative += batch.length;
        }
        console.log(`  [${source}] ${langCode}: ${words.length}`);
    }

    console.log(`\n[done] ${totalNative} native + ${totalEn} English = ${totalNative + totalEn} total`);
    await pool.end();
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
