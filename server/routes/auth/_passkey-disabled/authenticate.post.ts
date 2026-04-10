/**
 * POST /auth/passkey/authenticate — Sign in with an existing passkey.
 */
import { defineWebAuthnAuthenticateEventHandler } from 'nuxt-auth-utils/runtime/server/lib/webauthn/authenticate';
import { prisma } from '~/server/utils/prisma';

export default defineWebAuthnAuthenticateEventHandler({
    async allowCredentials(event, userName) {
        // If userName is provided, only allow credentials for that user
        if (userName) {
            const user = await prisma.user.findUnique({
                where: { email: userName },
                include: { credentials: true },
            });
            if (!user) return [];
            return user.credentials.map((c) => ({
                id: c.credentialId,
                transports: c.transports as AuthenticatorTransport[],
            }));
        }
        // Discoverable credentials (no userName) — allow any
        return [];
    },
    async getCredential(event, credentialId) {
        const cred = await prisma.credential.findUnique({
            where: { credentialId },
            include: { user: true },
        });
        if (!cred) throw createError({ statusCode: 400, message: 'Credential not found' });

        return {
            id: cred.credentialId,
            publicKey: cred.publicKey,
            counter: cred.counter,
            backedUp: cred.backedUp,
            transports: cred.transports as AuthenticatorTransport[],
            userId: cred.userId,
        };
    },
    async storeChallenge(event, challenge) {
        await updateUserSession(event, { webauthnChallenge: challenge });
    },
    async getChallenge(event) {
        const session = await getUserSession(event);
        return (session as Record<string, unknown>)?.webauthnChallenge as string;
    },
    async onSuccess(event, { credential }) {
        // Update counter
        await prisma.credential.update({
            where: { credentialId: credential.id },
            data: { counter: credential.counter },
        });

        // Find the user who owns this credential
        const cred = await prisma.credential.findUnique({
            where: { credentialId: credential.id },
            include: { user: true },
        });

        if (!cred) throw createError({ statusCode: 400, message: 'Credential not found' });

        await setUserSession(event, {
            user: {
                id: cred.user.id,
                email: cred.user.email,
                displayName: cred.user.displayName,
                avatarUrl: cred.user.avatarUrl,
                authProvider: 'passkey',
            },
        });

        return { ok: true };
    },
});
