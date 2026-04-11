/**
 * POST /api/auth/register — Create account with email + password.
 *
 * Sends a verification email via Resend. Account can't sync stats
 * or earn badges until email is verified.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '~/server/utils/prisma';
import { sendVerificationEmail } from '~/server/utils/email';
import { usernameFromEmail } from '~/server/utils/name-generator';

interface RegisterBody {
    email: string;
    password: string;
    displayName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default defineEventHandler(async (event) => {
    rateLimit(event, 'auth:register', 3, 60 * 60 * 1000); // 3 per hour
    const body = await readBody<RegisterBody>(event);

    if (!body?.email || !EMAIL_RE.test(body.email)) {
        throw createError({ statusCode: 400, message: 'Valid email is required' });
    }
    if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
        throw createError({
            statusCode: 400,
            message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
        throw createError({
            statusCode: 409,
            message: 'An account with this email already exists',
        });
    }

    const passwordHash = await bcrypt.hash(body.password, 14);
    const username = await usernameFromEmail(body.email);

    const user = await prisma.user.create({
        data: {
            username,
            email: body.email.toLowerCase(),
            passwordHash,
            displayName: body.displayName || body.email.split('@')[0],
            emailVerified: false,
        },
    });

    await sendVerificationEmail(user.id, user.email);

    await setSessionForUser(event, user, 'email');

    return { id: user.id, emailVerified: false };
});
