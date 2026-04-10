<template>
    <SharedBaseModal :visible="visible" size="sm" @close="$emit('close')">
        <div class="flex flex-col gap-4">
            <h3 class="heading-section text-xl text-ink">
                {{ mode === 'register' ? 'Create Account' : 'Sign In' }}
            </h3>

            <!-- Google OAuth -->
            <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-rule rounded-md text-sm font-semibold text-ink hover:bg-paper-warm transition-colors"
                @click="loginWithGoogle()"
            >
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
            </button>

            <div class="flex items-center gap-3">
                <div class="flex-1 h-px bg-rule" />
                <span class="mono-label">or</span>
                <div class="flex-1 h-px bg-rule" />
            </div>

            <!-- Email form -->
            <form @submit.prevent="submitEmail">
                <div v-if="mode === 'register'" class="mb-3">
                    <label for="login-name" class="text-xs text-muted block mb-1">Display Name</label>
                    <input
                        id="login-name"
                        v-model="displayName"
                        type="text"
                        class="w-full px-3 py-2 border border-rule rounded-md text-sm bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                        placeholder="Your name"
                    />
                </div>
                <div class="mb-3">
                    <label for="login-email" class="text-xs text-muted block mb-1">Email</label>
                    <input
                        id="login-email"
                        v-model="email"
                        type="email"
                        required
                        class="w-full px-3 py-2 border border-rule rounded-md text-sm bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                        placeholder="you@example.com"
                    />
                </div>
                <div class="mb-1">
                    <label for="login-password" class="text-xs text-muted block mb-1">Password</label>
                    <input
                        id="login-password"
                        v-model="password"
                        type="password"
                        required
                        :minlength="8"
                        class="w-full px-3 py-2 border border-rule rounded-md text-sm bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                        placeholder="Min 8 characters"
                    />
                </div>

                <button
                    v-if="mode === 'login'"
                    type="button"
                    class="text-xs text-accent hover:underline mb-3 block"
                    @click="forgotPassword"
                >
                    Forgot password?
                </button>

                <div v-if="error" class="text-xs text-accent mb-3">{{ error }}</div>
                <div v-if="success" class="text-xs text-correct mb-3">{{ success }}</div>

                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full px-4 py-2.5 bg-ink text-paper text-sm font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {{ loading ? '...' : (mode === 'register' ? 'Create Account' : 'Sign In') }}
                </button>
            </form>

            <!-- Toggle mode -->
            <p class="text-xs text-center text-muted">
                <template v-if="mode === 'login'">
                    No account?
                    <button class="text-accent hover:underline" @click="mode = 'register'; error = ''">Create one</button>
                </template>
                <template v-else>
                    Already have an account?
                    <button class="text-accent hover:underline" @click="mode = 'login'; error = ''">Sign in</button>
                </template>
            </p>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { loginWithGoogle, refreshSession } = useAuth();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const displayName = ref('');
const error = ref('');
const success = ref('');
const loading = ref(false);

async function submitEmail() {
    error.value = '';
    success.value = '';
    loading.value = true;

    try {
        if (mode.value === 'register') {
            const res = await $fetch('/api/auth/register', {
                method: 'POST',
                body: {
                    email: email.value,
                    password: password.value,
                    displayName: displayName.value || undefined,
                },
            });
            await refreshSession();
            if (!res.emailVerified) {
                success.value = 'Account created! Check your email to verify.';
            }
            setTimeout(() => emit('close'), 2000);
        } else {
            await $fetch('/api/auth/login', {
                method: 'POST',
                body: {
                    email: email.value,
                    password: password.value,
                },
            });
            await refreshSession();
            emit('close');
        }
    } catch (e: unknown) {
        const err = e as { data?: { message?: string } };
        error.value = err.data?.message || 'Something went wrong';
    } finally {
        loading.value = false;
    }
}

async function forgotPassword() {
    if (!email.value) {
        error.value = 'Enter your email first';
        return;
    }
    error.value = '';
    loading.value = true;

    try {
        await $fetch('/api/auth/forgot-password', {
            method: 'POST',
            body: { email: email.value },
        });
        success.value = 'If that email exists, a reset link was sent.';
    } catch {
        error.value = 'Something went wrong';
    } finally {
        loading.value = false;
    }
}
</script>
