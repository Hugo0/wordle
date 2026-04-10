/**
 * POST /auth/passkey/register — Register a new passkey for a logged-in user.
 *
 * Passkeys are an add-on auth method. Users must already have an account
 * (via Google or email) before they can register a passkey.
 */
import { defineWebAuthnRegisterEventHandler } from 'nuxt-auth-utils/runtime/server/lib/webauthn/register';
import { prisma } from '~/server/utils/prisma';

export default defineWebAuthnRegisterEventHandler({
    async validateUser(userBody, event) {
        const session = await requireUserSession(event);
        // Only allow registering passkeys for the currently logged-in user
        return {
            userName: session.user.email,
            displayName: session.user.displayName || session.user.email,
        };
    },
    async excludeCredentials(event) {
        const session = await getUserSession(event);
        if (!session?.user?.id) return [];

        const creds = await prisma.credential.findMany({
            where: { userId: session.user.id },
            select: { credentialId: true },
        });
        return creds.map((c) => c.credentialId);
    },
    async storeChallenge(event, challenge) {
        const session = await getUserSession(event);
        await updateUserSession(event, { webauthnChallenge: challenge });
    },
    async getChallenge(event) {
        const session = await getUserSession(event);
        return (session as Record<string, unknown>)?.webauthnChallenge as string;
    },
    async onSuccess(event, { credential }) {
        const session = await requireUserSession(event);

        await prisma.credential.create({
            data: {
                userId: session.user.id,
                credentialId: credential.id,
                publicKey: credential.publicKey,
                counter: credential.counter,
                backedUp: credential.backedUp,
                transports: credential.transports ?? [],
            },
        });

        return { ok: true };
    },
});
