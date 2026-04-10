import { prisma } from '~/server/utils/prisma';

export default defineOAuthGoogleEventHandler({
    config: {
        scope: ['openid', 'email', 'profile'],
    },
    async onSuccess(event, { user: googleUser }) {
        const user = await prisma.user.upsert({
            where: { googleId: googleUser.sub },
            create: {
                googleId: googleUser.sub,
                email: googleUser.email,
                emailVerified: true,
                displayName: googleUser.name,
                avatarUrl: googleUser.picture,
            },
            update: {
                emailVerified: true,
                displayName: googleUser.name,
                avatarUrl: googleUser.picture,
            },
        });

        await setUserSession(event, {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                authProvider: 'google',
            },
        });

        const redirect = getCookie(event, 'auth-redirect') || '/';
        deleteCookie(event, 'auth-redirect');
        return sendRedirect(event, redirect);
    },
    onError(event, error) {
        console.error('[auth] Google OAuth error:', error);
        return sendRedirect(event, '/?auth_error=1');
    },
});
