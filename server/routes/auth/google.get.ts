import { prisma } from '~/server/utils/prisma';
import { usernameFromEmail } from '~/server/utils/name-generator';

export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['openid', 'email', 'profile'],
    },
    async onSuccess(event, { user: googleUser }) {
        // Check if user already exists (returning login)
        let user = await prisma.user.findUnique({ where: { googleId: googleUser.sub } });

        if (!user) {
            // New user — generate unique username from email
            const username = await usernameFromEmail(googleUser.email);
            user = await prisma.user.create({
                data: {
                    username,
                    googleId: googleUser.sub,
                    email: googleUser.email,
                    emailVerified: true,
                    displayName: googleUser.name,
                    avatarUrl: googleUser.picture,
                },
            });
        } else {
            // Returning user — update avatar/name
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    displayName: googleUser.name,
                    avatarUrl: googleUser.picture,
                },
            });
        }

        await setSessionForUser(event, user, 'google');

        const redirect = getCookie(event, 'auth-redirect') || '/';
        deleteCookie(event, 'auth-redirect');
        return sendRedirect(event, redirect);
    },
    onError(event, error) {
        console.error('[auth] Google OAuth error:', error);
        return sendRedirect(event, '/?auth_error=1');
    },
});
