/**
 * Shared session helper — ensures consistent session payload shape
 * across all auth endpoints (Google, email, passkey, dev-login).
 */
import type { H3Event } from 'h3';

interface SessionUser {
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
}

export async function setSessionForUser(
    event: H3Event,
    user: SessionUser,
    authProvider: 'google' | 'email' | 'passkey'
) {
    await setUserSession(event, {
        user: {
            id: user.id,
            email: user.email ?? '',
            displayName: user.displayName,
            // Use Google avatar if available, otherwise generated SVG avatar
            avatarUrl: user.avatarUrl || `/api/avatar/${user.id}`,
            authProvider,
        },
    });
}
