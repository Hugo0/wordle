/**
 * POST /api/auth/login — Sign in with email + password.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '~/server/utils/prisma';

interface LoginBody {
    email: string;
    password: string;
}

export default defineEventHandler(async (event) => {
    rateLimit(event, 'auth:login', 5, 15 * 60 * 1000); // 5 attempts per 15 min
    const body = await readBody<LoginBody>(event);

    if (!body?.email || !body?.password) {
        throw createError({ statusCode: 400, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
        throw createError({ statusCode: 401, message: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
        throw createError({ statusCode: 401, message: 'Invalid email or password' });
    }

    await setSessionForUser(event, user, 'email');

    return { id: user.id, emailVerified: user.emailVerified };
});
