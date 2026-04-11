/**
 * GET /api/auth/dev-login — Dev-only: create a session for a test user.
 *
 * Bypasses OAuth for automated testing. Only available in development.
 * Creates a test user in the DB if it doesn't exist, then sets a session cookie.
 *
 * Usage: navigate to /api/auth/dev-login in the browser, or fetch it programmatically.
 * Redirects to / after login.
 */
import { prisma } from '~/server/utils/prisma';

const TEST_USER = {
    email: 'test@wordle.global',
    displayName: 'Test Player',
    googleId: 'dev-test-user',
};

export default defineEventHandler(async (event) => {
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_LOGIN !== 'true') {
        throw createError({ statusCode: 404, message: 'Not found' });
    }

    const user = await prisma.user.upsert({
        where: { email: TEST_USER.email },
        create: {
            username: 'test_player',
            email: TEST_USER.email,
            displayName: TEST_USER.displayName,
            googleId: TEST_USER.googleId,
            emailVerified: true,
        },
        update: {},
    });

    await setSessionForUser(event, user, 'google');

    return sendRedirect(event, '/');
});
