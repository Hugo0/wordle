/**
 * GET /api/badges — Public endpoint returning all badge definitions.
 *
 * No auth required. Used by the profile page to show locked badges.
 * Cached server-side for 1 hour (badge definitions rarely change).
 */
import { prisma } from '~/server/utils/prisma';

let cachedBadges: unknown[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default defineEventHandler(async () => {
    if (cachedBadges && Date.now() - cachedAt < CACHE_TTL) {
        return cachedBadges;
    }

    const badges = await prisma.badge.findMany({
        select: {
            slug: true,
            name: true,
            description: true,
            category: true,
            threshold: true,
            icon: true,
        },
        orderBy: [{ category: 'asc' }, { threshold: 'asc' }],
    });

    cachedBadges = badges;
    cachedAt = Date.now();
    return badges;
});
