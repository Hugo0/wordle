/**
 * Auth composable — thin wrapper around nuxt-auth-utils session.
 *
 * Provides `loginWithGoogle()`, `logout()`, and reactive auth state.
 * All auth is optional — never required to play.
 */
export function useAuth() {
    const { loggedIn, user, clear, fetch: refreshSession } = useUserSession();

    function loginWithGoogle(redirectPath?: string) {
        if (import.meta.client && redirectPath) {
            document.cookie = `auth-redirect=${redirectPath}; path=/; max-age=300; SameSite=Lax`;
        }
        navigateTo('/auth/google', { external: true });
    }

    async function logout() {
        await $fetch('/api/auth/logout', { method: 'POST' });
        await clear();
    }

    return {
        loggedIn,
        user,
        loginWithGoogle,
        logout,
        refreshSession,
    };
}
