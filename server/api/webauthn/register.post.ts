/**
 * POST /api/webauthn/register — Register a new passkey.
 *
 * Two flows:
 *   1. Logged-in user adding a passkey to their existing account
 *   2. New user creating an account with just a passkey (no Google, no email)
 *
 * For new users, the client pre-fetches a name from /api/auth/generate-name
 * and passes it as userName/displayName. This ensures the name shown in the
 * browser credential dialog matches the account that gets created.
 */
import { prisma } from '~/server/utils/prisma';
import { sanitizeUsername, generateUniqueUsername } from '~/server/utils/name-generator';

export default defineWebAuthnRegisterEventHandler({
    async validateUser(userBody, event) {
        const session = await getUserSession(event);

        // Logged-in user adding a passkey
        if (session.user?.id) {
            return {
                userName: session.user.displayName || session.user.email || session.user.id,
                displayName: session.user.displayName || 'Player',
            };
        }

        // New user — validate the client-provided name
        let displayName = String(userBody.displayName || userBody.userName || '')
            .trim()
            .slice(0, 50);
        if (!displayName || displayName.length < 2) {
            displayName = 'Player';
        }
        // Reject anything that looks like injection or abuse
        if (/[<>"';&]/.test(displayName)) {
            displayName = 'Player';
        }

        return {
            userName: displayName,
            displayName,
        };
    },
    async onSuccess(event, { credential, user }) {
        const session = await getUserSession(event);
        let userId = session.user?.id;

        if (!userId) {
            // New user — use the name from validateUser (which came from the client)
            const displayName = user.displayName || 'Player';
            const username = await generateUniqueUsername(sanitizeUsername(displayName));

            const dbUser = await prisma.user.create({
                data: {
                    username,
                    displayName,
                    email: null,
                },
            });
            userId = dbUser.id;
        }

        await prisma.credential.create({
            data: {
                userId,
                credentialId: credential.id,
                publicKey: credential.publicKey,
                counter: credential.counter,
                backedUp: credential.backedUp,
                transports: credential.transports ?? [],
            },
        });

        const dbUser = await prisma.user.findUnique({ where: { id: userId } });
        if (dbUser) await setSessionForUser(event, dbUser, 'passkey');
    },
});
