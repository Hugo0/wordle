import { consola } from 'consola';
import { prisma } from '~/server/utils/prisma';

export default defineNitroPlugin(async (nitro) => {
    try {
        await prisma.$connect();
        consola.info('[prisma] connected');
    } catch (e) {
        // Don't crash the server if DB is unavailable — the app works
        // without auth (localStorage-only mode). API endpoints that need
        // the DB will fail individually with clear errors.
        consola.warn('[prisma] connection failed, running without database:', (e as Error).message);
    }

    nitro.hooks.hook('close', async () => {
        await prisma.$disconnect();
    });
});
