<script setup lang="ts">
import { Bug, MessageSquare, Send, CheckCircle } from 'lucide-vue-next';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const reportType = ref<'bug' | 'feedback'>('bug');
const message = ref('');
const sending = ref(false);
const sent = ref(false);
const error = ref('');

const route = useRoute();
const { showToast } = useToast();

// Auto-collect context (client-only, safe defaults)
function collectContext() {
    if (!import.meta.client) return {};
    const isPwa =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
    return {
        url: window.location.href,
        lang: route.params.lang as string || undefined,
        mode: route.params.mode as string || route.query.mode as string || undefined,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        isPwa,
    };
}

async function submit() {
    const trimmed = message.value.trim();
    if (trimmed.length < 5) {
        error.value = 'Please write a bit more so we can understand the issue.';
        return;
    }

    sending.value = true;
    error.value = '';

    try {
        await $fetch('/api/report', {
            method: 'POST',
            body: {
                type: reportType.value,
                message: trimmed,
                ...collectContext(),
            },
        });
        sent.value = true;
    } catch (e: any) {
        if (e.statusCode === 429) {
            error.value = 'Too many reports — please try again later.';
        } else {
            error.value = 'Something went wrong. Please try again.';
        }
    } finally {
        sending.value = false;
    }
}

function handleClose() {
    if (sent.value) {
        showToast('Report sent — thank you!');
    }
    // Reset state for next open
    message.value = '';
    sent.value = false;
    error.value = '';
    reportType.value = 'bug';
    emit('close');
}

// Reset on re-open
watch(() => props.visible, (open) => {
    if (open) {
        sent.value = false;
        error.value = '';
    }
});
</script>

<template>
    <BaseModal :visible="visible" size="sm" @close="handleClose">
        <!-- Success state -->
        <div v-if="sent" class="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle :size="36" class="text-correct" />
            <h3 class="heading-section text-lg text-ink">Report received</h3>
            <p class="text-sm text-muted max-w-[240px]">
                Thanks for helping improve Wordle Global. We'll look into this.
            </p>
            <button
                class="mt-2 px-5 py-2 bg-ink text-paper text-sm font-semibold transition-opacity hover:opacity-85 cursor-pointer"
                @click="handleClose"
            >
                Done
            </button>
        </div>

        <!-- Form state -->
        <template v-else>
            <h3 class="heading-section text-xl text-ink">Report an issue</h3>
            <p class="text-sm text-muted mt-1 mb-4">
                Found a bug or have feedback? Let us know.
            </p>

            <!-- Type toggle -->
            <div class="flex gap-2 mb-4">
                <button
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer"
                    :class="reportType === 'bug'
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-transparent text-muted border-rule hover:border-ink hover:text-ink'"
                    @click="reportType = 'bug'"
                >
                    <Bug :size="14" />
                    Bug
                </button>
                <button
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer"
                    :class="reportType === 'feedback'
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-transparent text-muted border-rule hover:border-ink hover:text-ink'"
                    @click="reportType = 'feedback'"
                >
                    <MessageSquare :size="14" />
                    Feedback
                </button>
            </div>

            <!-- Message -->
            <textarea
                v-model="message"
                :placeholder="reportType === 'bug'
                    ? 'What happened? What did you expect to happen?'
                    : 'What would you like to see changed or added?'"
                class="w-full h-32 px-3 py-2.5 text-sm text-ink bg-paper border border-rule placeholder:text-muted/50 resize-none focus:outline-none focus:border-ink transition-colors editorial-scroll"
                maxlength="2000"
                :disabled="sending"
                @keydown.meta.enter="submit"
                @keydown.ctrl.enter="submit"
            />
            <div class="flex items-center justify-between mt-1 mb-3">
                <div v-if="error" class="text-xs text-accent">{{ error }}</div>
                <div v-else class="text-[10px] text-muted/50">
                    Page URL, browser, and screen size are sent automatically.
                </div>
                <div class="text-[10px] text-muted/40 ml-auto">
                    {{ message.length }}/2000
                </div>
            </div>

            <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-paper text-sm font-semibold transition-opacity hover:opacity-85 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="sending || message.trim().length < 5"
                @click="submit"
            >
                <Send :size="14" />
                {{ sending ? 'Sending…' : 'Send report' }}
            </button>
        </template>
    </BaseModal>
</template>
