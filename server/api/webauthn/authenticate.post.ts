/**
 * POST /api/webauthn/authenticate — Sign in with a passkey.
 *
 * Following the official nuxt-auth-utils playground pattern.
 */
import { prisma } from '~/server/utils/prisma';

export default defineWebAuthnAuthenticateEventHandler({
    async allowCredentials(event, userName) {
        const user = await prisma.user.findUnique({
            where: { email: userName },
            include: { credentials: true },
        });

        if (!user?.credentials.length) {
            throw createError({ statusCode: 400, message: 'User not found' });
        }

        return user.credentials.map((c) => ({
            id: c.credentialId,
            transports: c.transports as string[],
        }));
    },
    async getCredential(event, credentialId) {
        const cred = await prisma.credential.findUnique({
            where: { credentialId },
        });

        if (!cred) {
            throw createError({ statusCode: 400, message: 'Credential not found' });
        }

        return {
            ...cred,
            id: cred.credentialId,
            transports: cred.transports as string[],
        };
    },
    async onSuccess(event, { credential, authenticationInfo }) {
        // Update counter
        await prisma.credential.update({
            where: { credentialId: credential.id },
            data: { counter: authenticationInfo.newCounter },
        });

        // Find the user
        const cred = await prisma.credential.findUnique({
            where: { credentialId: credential.id },
            include: { user: true },
        });

        if (!cred) throw createError({ statusCode: 400, message: 'Credential not found' });

        await setSessionForUser(event, cred.user, 'passkey');
    },
});
