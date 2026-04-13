<template>
    <BaseModal :visible="visible" size="sm" @close="handleClose">
        <Transition :name="transitionName" mode="out-in">
            <!-- ── Step 1: Main login options ── -->
            <div v-if="step === 'main'" key="main" class="flex flex-col gap-4">
                <h3 class="heading-section text-xl text-ink">Sign In</h3>
                <p class="text-sm text-muted -mt-2">Sync your stats across devices and earn badges.</p>

                <!-- Auth buttons — ordered by platform: passkey first on iOS, Google first elsewhere -->
                <template v-for="method in authOrder" :key="method">
                    <button
                        v-if="method === 'google'"
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

                    <button
                        v-else-if="method === 'passkey' && passkeySupported"
                        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                        @click="goToPasskeyChoice()"
                    >
                        <Fingerprint :size="16" />
                        Continue with Passkey
                    </button>
                </template>

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

            <!-- ── Step 2: Passkey — new or returning? ── -->
            <div v-else-if="step === 'passkey'" key="passkey" class="flex flex-col gap-4">
                <div>
                    <button
                        class="flex items-center gap-1.5 text-muted hover:text-ink transition-colors -ml-0.5 mb-3"
                        @click="goBack()"
                    >
                        <ArrowLeft :size="15" :stroke-width="1.5" />
                        <span class="text-xs">Back</span>
                    </button>

                    <div class="text-center">
                        <span class="eyebrow">Passkey</span>
                        <h3 class="heading-section text-xl text-ink mt-1.5">First time here?</h3>
                    </div>
                </div>

                <!-- New user — create account -->
                <button
                    class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                    :disabled="passkeyLoading"
                    @click="handleRegister()"
                >
                    <UserPlus :size="16" :stroke-width="1.5" />
                    Create account
                </button>

                <!-- Returning user — sign in -->
                <button
                    class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                    :disabled="passkeyLoading"
                    @click="handleAuthenticate()"
                >
                    <LogIn :size="16" :stroke-width="1.5" />
                    Sign in with existing passkey
                </button>

                <div v-if="error" class="text-xs text-accent text-center">{{ error }}</div>

                <p v-if="passkeyLoading" class="text-xs text-muted text-center">
                    Waiting for passkey...
                </p>
            </div>

            <!-- ── Step 3: Success ── -->
            <div v-else key="success" class="flex flex-col items-center gap-3 py-6">
                <div class="success-icon-ring">
                    <Fingerprint :size="28" class="text-correct" />
                </div>
                <h3 class="heading-section text-xl text-ink">{{ successMessage }}</h3>
                <p class="text-sm text-muted">
                    {{ isNewAccount ? 'Your passkey has been created.' : 'Signed in with your passkey.' }}
                </p>
            </div>
        </Transition>
    </BaseModal>
</template>

<script setup lang="ts">
import { Fingerprint, Mail, ArrowLeft, UserPlus, LogIn } from 'lucide-vue-next';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { loginWithGoogle, refreshSession } = useAuth();

type Step = 'main' | 'passkey' | 'success';
const step = ref<Step>('main');
const transitionName = ref('step-forward');
const error = ref('');
const passkeyLoading = ref(false);
const passkeySupported = ref(false);
const successMessage = ref('');
const isNewAccount = ref(false);

const { authenticate, register, isPlatformAvailable } = useWebAuthn({
    authenticateEndpoint: '/api/webauthn/authenticate',
    registerEndpoint: '/api/webauthn/register',
});

// iPhone users get passkey first (Face ID is the native auth primitive);
// everyone else gets Google first (path of least resistance on Android/desktop)
const isIOS = ref(false);
const authOrder = computed<Array<'google' | 'passkey'>>(() =>
    isIOS.value ? ['passkey', 'google'] : ['google', 'passkey'],
);

if (import.meta.client) {
    onMounted(async () => {
        isIOS.value = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (!window.PublicKeyCredential) return;
        passkeySupported.value = await isPlatformAvailable();
    });
}

// Reset state when modal opens/closes
watch(
    () => props.visible,
    (isVisible) => {
        if (isVisible) {
            step.value = 'main';
            transitionName.value = 'step-forward';
            successMessage.value = '';
            error.value = '';
            passkeyLoading.value = false;
        }
    },
);

function goToPasskeyChoice() {
    transitionName.value = 'step-forward';
    error.value = '';
    step.value = 'passkey';
}

function goBack() {
    transitionName.value = 'step-back';
    error.value = '';
    step.value = 'main';
}

function handleClose() {
    emit('close');
}

async function handleRegister() {
    error.value = '';
    passkeyLoading.value = true;

    try {
        const { displayName } = await $fetch('/api/auth/generate-name');
        await register({ userName: displayName, displayName });
        await refreshSession();
        isNewAccount.value = true;
        successMessage.value = `Welcome, ${displayName}!`;
        transitionName.value = 'step-success';
        step.value = 'success';
        setTimeout(() => emit('close'), 1500);
    } catch (regErr: unknown) {
        const msg =
            (regErr as { data?: { message?: string }; message?: string })?.data?.message ||
            (regErr as { message?: string })?.message ||
            '';
        if (!msg.includes('abort') && !msg.includes('cancel') && !msg.includes('NotAllowed')) {
            error.value = msg || 'Failed to create passkey';
        }
    } finally {
        passkeyLoading.value = false;
    }
}

async function handleAuthenticate() {
    error.value = '';
    passkeyLoading.value = true;

    try {
        await authenticate();
        await refreshSession();
        isNewAccount.value = false;
        successMessage.value = 'Welcome back!';
        transitionName.value = 'step-success';
        step.value = 'success';
        setTimeout(() => emit('close'), 1500);
    } catch (authErr: unknown) {
        const msg =
            (authErr as { data?: { message?: string }; message?: string })?.data?.message ||
            (authErr as { message?: string })?.message ||
            '';
        if (!msg.includes('abort') && !msg.includes('cancel') && !msg.includes('NotAllowed')) {
            error.value = msg || 'Could not find a passkey for this site';
        }
    } finally {
        passkeyLoading.value = false;
    }
}
</script>

<style scoped>
/* ── Step transitions ── */

/* Forward: content slides left */
.step-forward-enter-active,
.step-forward-leave-active {
    transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.step-forward-enter-from {
    opacity: 0;
    transform: translateX(20px);
}
.step-forward-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}

/* Back: content slides right */
.step-back-enter-active,
.step-back-leave-active {
    transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.step-back-enter-from {
    opacity: 0;
    transform: translateX(-20px);
}
.step-back-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

/* Success: gentle rise */
.step-success-enter-active {
    transition: all 300ms cubic-bezier(0.22, 1, 0.36, 1);
}
.step-success-leave-active {
    transition: all 150ms ease;
}
.step-success-enter-from {
    opacity: 0;
    transform: translateY(8px);
}
.step-success-leave-to {
    opacity: 0;
}

/* ── Success icon ring ── */

.success-icon-ring {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    border: 2px solid var(--color-correct);
    animation: success-appear 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes success-appear {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
