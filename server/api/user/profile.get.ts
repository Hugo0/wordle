/**
 * GET /api/user/profile — User profile with badges and subscription status.
 */
import { prisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            badges: { include: { badge: true } },
            subscription: true,
        },
    });

    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    return {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        createdAt: user.createdAt,
        settings: user.settings,
        badges: user.badges.map((ub) => ({
            slug: ub.badge.slug,
            name: ub.badge.name,
            description: ub.badge.description,
            category: ub.badge.category,
            icon: ub.badge.icon,
            earnedAt: ub.earnedAt,
        })),
        isPro: user.subscription?.status === 'active',
    };
});
