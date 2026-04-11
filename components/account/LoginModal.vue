<template>
    <BaseModal :visible="visible" size="sm" @close="$emit('close')">
        <div class="flex flex-col gap-4">
            <h3 class="heading-section text-xl text-ink">Sign In</h3>
            <p class="text-sm text-muted -mt-2">Sync your stats across devices and earn badges.</p>

            <!-- Google OAuth -->
            <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                @click="loginWithGoogle()"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
                Continue with Google
            </button>

            <!-- Passkey — single button, handles both sign-in and registration -->
            <button
                v-if="passkeySupported"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                :disabled="passkeyLoading"
                @click="handlePasskey()"
            >
                <Fingerprint :size="16" />
                {{ passkeyLoading ? 'Waiting...' : 'Continue with Passkey' }}
            </button>

            <div v-if="error" class="text-xs text-accent text-center">{{ error }}</div>

            <!-- Email (coming soon) -->
            <button
                disabled
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm text-muted cursor-not-allowed opacity-50"
            >
                <Mail :size="16" />
                Sign in with Email
                <span class="mono-label ml-1">soon</span>
            </button>
        </div>
    </BaseModal>
</template>

<script setup lang="ts">
import { Fingerprint, Mail } from 'lucide-vue-next';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { loginWithGoogle, refreshSession } = useAuth();

const error = ref('');
const passkeyLoading = ref(false);
const passkeySupported = ref(false);

// Must be called at top level of setup, not inside async handlers
const { authenticate, register } = useWebAuthn({
    authenticateEndpoint: '/api/webauthn/authenticate',
    registerEndpoint: '/api/webauthn/register',
});

if (import.meta.client) {
    onMounted(() => {
        passkeySupported.value = !!window.PublicKeyCredential;
    });
}

async function handlePasskey() {
    error.value = '';
    passkeyLoading.value = true;

    try {
        // Try discoverable credential authentication first
        await authenticate();
        await refreshSession();
        emit('close');
    } catch (authErr: unknown) {
        const msg =
            (authErr as { data?: { message?: string }; message?: string })?.data?.message ||
            (authErr as { message?: string })?.message ||
            '';

        // User explicitly cancelled
        if (msg.includes('abort') || msg.includes('cancel') || msg.includes('NotAllowed')) {
            passkeyLoading.value = false;
            return;
        }

        // No credential or wrong credential — auto-register a new account
        // Fetch a name from the server so the browser prompt and the account match
        try {
            const { displayName } = await $fetch('/api/auth/generate-name');
            await register({ userName: displayName, displayName });
            await refreshSession();
            emit('close');
        } catch (regErr: unknown) {
            const regMsg =
                (regErr as { data?: { message?: string }; message?: string })?.data?.message ||
                (regErr as { message?: string })?.message ||
                '';
            if (!regMsg.includes('abort') && !regMsg.includes('cancel')) {
                error.value = regMsg || 'Failed to create passkey';
            }
        }
    } finally {
        passkeyLoading.value = false;
    }
}
</script>
