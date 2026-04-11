/**
 * GET /api/auth/verify-email?token=... — Verify email address.
 *
 * Called when user clicks the link in their verification email.
 * Redirects to /stats with a success message.
 */
import { prisma } from '~/server/utils/prisma';
import { verifyToken } from '~/server/utils/email';

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const token = query.token as string;

    if (!token) {
        return sendRedirect(event, '/?error=invalid_token');
    }

    const result = verifyToken(token, 'verify');
    if (!result) {
        return sendRedirect(event, '/?error=expired_token');
    }

    await prisma.user.update({
        where: { id: result.userId },
        data: { emailVerified: true },
    });

    return sendRedirect(event, '/stats?verified=1');
});
