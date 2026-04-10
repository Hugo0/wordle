import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Singleton PrismaClient — reused across all Nitro handlers.
// In development, Nitro hot-reloads server code; storing on globalThis
// prevents leaked connections from stale module instances.
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn('[prisma] DATABASE_URL not set — database features disabled');
    }

    // Render Postgres requires SSL for external connections.
    // pg.Pool defaults to no SSL, so we must enable it explicitly.
    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool, { schema: 'wordle' });

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
}

export const prisma: PrismaClient = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
}
