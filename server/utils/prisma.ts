// @prisma/client is CJS — named ESM import breaks in vitest's ESM transform.
// Default import + destructure works in both Nitro (Render) and vitest (CI).
// See commits facb5e40, 2e14401c for the original debugging.
import prismaClientPkg from '@prisma/client';
const { PrismaClient } = prismaClientPkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Singleton PrismaClient — reused across all Nitro handlers.
// In development, Nitro hot-reloads server code; storing on globalThis
// prevents leaked connections from stale module instances.
const globalForPrisma = globalThis as unknown as { __prisma?: InstanceType<typeof PrismaClient> };

function createClient(): InstanceType<typeof PrismaClient> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('[prisma] DATABASE_URL not set — database features disabled');
    } else {
        console.info('[prisma] connecting to:', connectionString.replace(/:[^:@]+@/, ':***@'));
    }

    // Render requires SSL for all connections (internal and external).
    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 20,
        min: 2,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 15000,
    });

    pool.on('error', (err) => {
        console.error('[prisma] pg pool error:', err.message);
    });

    const adapter = new PrismaPg(pool, { schema: 'wordle' });

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
}

export const prisma: InstanceType<typeof PrismaClient> = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
}
