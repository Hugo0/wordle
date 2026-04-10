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
            // HttpOnly not possible from client JS — but SameSite + Secure + short max-age mitigate risk
            const secure = window.location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `auth-redirect=${encodeURIComponent(redirectPath)}; path=/; max-age=300; SameSite=Lax${secure}`;
        }
        navigateTo('/auth/google', { external: true });
    }

    async function logout() {
        await $fetch('/api/auth/logout', { method: 'POST' });
        await clear();
        const { showToast } = useToast();
        showToast('Signed out');
        await navigateTo('/');
    }

    // Resolved avatar: Google photo → generated marble SVG fallback
    const avatarUrl = computed(() =>
        user.value?.avatarUrl || (user.value?.id ? `/api/avatar/${user.value.id}` : null)
    );

    return {
        loggedIn,
        user,
        avatarUrl,
        loginWithGoogle,
        logout,
        refreshSession,
    };
}
