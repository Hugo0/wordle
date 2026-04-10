/**
 * GET /api/user/settings — Fetch user settings from DB.
 *
 * Used on login from a new device to populate localStorage
 * with the user's previously saved preferences.
 */
import { prisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { settings: true },
    });

    return { settings: (user?.settings as Record<string, boolean | string>) ?? {} };
});
