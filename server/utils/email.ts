/**
 * Email utilities — verification and password reset via Resend.
 *
 * Tokens are HMAC-signed with the session secret, not stored in DB.
 * This avoids a separate tokens table and cleanup job.
 */
import { createHmac } from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const BASE_URL = process.env.NUXT_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.NUXT_EMAIL_TOKEN_SECRET || process.env.NUXT_SESSION_PASSWORD || '';
if (!SECRET && process.env.NODE_ENV === 'production') {
    throw new Error(
        '[email] NUXT_EMAIL_TOKEN_SECRET or NUXT_SESSION_PASSWORD must be set in production'
    );
}

// Token format: base64url(userId:expiry:hmac)
function createToken(userId: string, purpose: string, expiryHours: number): string {
    const expiry = Date.now() + expiryHours * 60 * 60 * 1000;
    const payload = `${userId}:${expiry}:${purpose}`;
    const hmac = createHmac('sha256', SECRET).update(payload).digest('base64url');
    return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifyToken(token: string, purpose: string): { userId: string } | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString();
        const parts = decoded.split(':');
        if (parts.length !== 4) return null;

        const [userId, expiryStr, tokenPurpose, providedHmac] = parts;
        if (tokenPurpose !== purpose) return null;

        const expiry = parseInt(expiryStr!, 10);
        if (Date.now() > expiry) return null;

        const payload = `${userId}:${expiryStr}:${tokenPurpose}`;
        const expectedHmac = createHmac('sha256', SECRET).update(payload).digest('base64url');
        if (providedHmac !== expectedHmac) return null;

        return { userId: userId! };
    } catch {
        return null;
    }
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[email] RESEND_API_KEY not set — email not sent to', to);
        console.info('[email] Would have sent:', subject);
        return false;
    }

    try {
        const { Resend } = await import('resend');
        const resend = new Resend(RESEND_API_KEY);
        await resend.emails.send({
            from: 'Wordle Global <noreply@wordle.global>',
            to,
            subject,
            html,
        });
        return true;
    } catch (e) {
        console.error('[email] Failed to send:', (e as Error).message);
        return false;
    }
}

export async function sendVerificationEmail(userId: string, email: string): Promise<boolean> {
    const token = createToken(userId, 'verify', 24);
    const url = `${BASE_URL}/api/auth/verify-email?token=${token}`;

    return sendEmail(
        email,
        'Verify your Wordle Global account',
        `
        <p>Welcome to Wordle Global!</p>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${url}">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
        `
    );
}

export async function sendPasswordResetEmail(userId: string, email: string): Promise<boolean> {
    const token = createToken(userId, 'reset', 1);
    const url = `${BASE_URL}/api/auth/reset-password?token=${token}`;

    return sendEmail(
        email,
        'Reset your Wordle Global password',
        `
        <p>You requested a password reset for your Wordle Global account.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${url}">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can ignore this email.</p>
        `
    );
}
