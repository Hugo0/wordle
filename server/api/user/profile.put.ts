/**
 * PUT /api/user/profile — Update display name (and future fields).
 */
import { prisma } from '~/server/utils/prisma';

interface ProfileUpdateBody {
    displayName?: string;
}

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readBody<ProfileUpdateBody>(event);

    const updates: Record<string, unknown> = {};

    if (typeof body?.displayName === 'string') {
        const name = body.displayName.trim();
        if (name.length < 2 || name.length > 30) {
            throw createError({ statusCode: 400, message: 'Name must be 2-30 characters' });
        }
        // Only allow letters, numbers, spaces, hyphens, underscores, periods
        if (!/^[\p{L}\p{N}\s\-_.]+$/u.test(name)) {
            throw createError({
                statusCode: 400,
                message: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
            });
        }
        // No consecutive spaces or leading/trailing special chars
        if (/\s{2,}/.test(name) || /^[\-_.]|[\-_.]$/.test(name)) {
            throw createError({ statusCode: 400, message: 'Invalid name format' });
        }
        // Check uniqueness (case-insensitive)
        const existing = await prisma.user.findFirst({
            where: {
                displayName: { equals: name, mode: 'insensitive' },
                id: { not: session.user.id },
            },
        });
        if (existing) {
            throw createError({ statusCode: 409, message: 'This name is already taken' });
        }
        updates.displayName = name;
    }

    if (Object.keys(updates).length === 0) {
        throw createError({ statusCode: 400, message: 'Nothing to update' });
    }

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updates,
    });

    // Update session so header/sidebar reflect the new name immediately
    await setSessionForUser(event, user, session.user.authProvider);

    return { displayName: user.displayName };
});
