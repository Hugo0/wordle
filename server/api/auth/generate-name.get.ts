/**
 * GET /api/auth/generate-name — Generate a unique display name + username.
 *
 * Called by the client before passkey registration so the name shown
 * in the browser credential dialog matches the account that gets created.
 * No auth required (user doesn't have an account yet).
 */
import { generatePasskeyIdentity } from '~/server/utils/name-generator';

export default defineEventHandler(async () => {
    return generatePasskeyIdentity();
});
