/**
 * POST /api/auth/forgot-password — Send password reset email.
 *
 * Always returns 200 regardless of whether the email exists,
 * to prevent email enumeration.
 */
import { prisma } from '~/server/utils/prisma';
import { sendPasswordResetEmail } from '~/server/utils/email';

export default defineEventHandler(async (event) => {
    rateLimit(event, 'auth:reset', 3, 60 * 60 * 1000); // 3 per hour
    const body = await readBody<{ email: string }>(event);

    if (!body?.email) {
        throw createError({ statusCode: 400, message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
    });

    // Send email only if user exists and has a password (not Google-only)
    if (user?.passwordHash && user.email) {
        await sendPasswordResetEmail(user.id, user.email);
    }

    // Always return success to prevent email enumeration
    return { ok: true };
});
