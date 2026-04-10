/**
 * POST /api/auth/reset-password — Set new password using reset token.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '~/server/utils/prisma';
import { verifyToken } from '~/server/utils/email';

interface ResetBody {
    token: string;
    password: string;
}

const MIN_PASSWORD_LENGTH = 8;

export default defineEventHandler(async (event) => {
    const body = await readBody<ResetBody>(event);

    if (!body?.token || !body?.password) {
        throw createError({ statusCode: 400, message: 'Token and password are required' });
    }
    if (body.password.length < MIN_PASSWORD_LENGTH) {
        throw createError({
            statusCode: 400,
            message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
    }

    const result = verifyToken(body.token, 'reset');
    if (!result) {
        throw createError({ statusCode: 400, message: 'Invalid or expired reset link' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    await prisma.user.update({
        where: { id: result.userId },
        data: { passwordHash },
    });

    return { ok: true };
});
