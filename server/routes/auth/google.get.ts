import { prisma } from '~/server/utils/prisma';
import { usernameFromEmail } from '~/server/utils/name-generator';

/** Retry a DB operation once on transient connection errors (ECONNREFUSED, etc.) */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        const code = err?.cause?.code ?? err?.code;
        if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
            console.warn('[auth] DB connection failed, retrying once:', code);
            return await fn();
        }
        throw err;
    }
}

export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['openid', 'email', 'profile'],
    },
    async onSuccess(event, { user: googleUser }) {
        // Check if user already exists (returning login)
        let user = await withRetry(() =>
            prisma.user.findUnique({ where: { googleId: googleUser.sub } })
        );

        if (!user) {
            // New user — generate unique username from email
            const username = await usernameFromEmail(googleUser.email);
            user = await withRetry(() =>
                prisma.user.create({
                    data: {
                        username,
                        googleId: googleUser.sub,
                        email: googleUser.email,
                        emailVerified: true,
                        displayName: googleUser.name,
                        avatarUrl: googleUser.picture,
                    },
                })
            );
        } else {
            // Returning user — update avatar/name
            user = await withRetry(() =>
                prisma.user.update({
                    where: { id: user!.id },
                    data: {
                        emailVerified: true,
                        displayName: googleUser.name,
                        avatarUrl: googleUser.picture,
                    },
                })
            );
        }

        await setSessionForUser(event, user, 'google');

        const raw = getCookie(event, 'auth-redirect') || '/';
        deleteCookie(event, 'auth-redirect');
        // Prevent open redirect — only allow relative paths
        const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
        return sendRedirect(event, redirect);
    },
    onError(event, error) {
        console.error('[auth] Google OAuth error:', error);
        return sendRedirect(event, '/?auth_error=1');
    },
});
