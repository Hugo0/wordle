/**
 * GET /api/other-wordles — external Wordle links for homepage.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

interface OtherWordle {
    name: string;
    language: string;
    url: string;
}

function resolveDataDir(): string {
    const envDataDir = process.env.NUXT_DATA_DIR;
    if (envDataDir && existsSync(envDataDir)) return envDataDir;

    const candidates = [
        resolve(process.cwd(), 'data'),
        resolve(process.cwd(), '..', 'data'),
    ];
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot find data/ directory.`);
}

let _cached: OtherWordle[] | null = null;

export default defineEventHandler(() => {
    if (_cached) return _cached;

    const dataDir = resolveDataDir();
    const filePath = join(dataDir, 'other_wordles.json');
    if (!existsSync(filePath)) return [];

    _cached = JSON.parse(readFileSync(filePath, 'utf-8')) as OtherWordle[];
    return _cached;
});
