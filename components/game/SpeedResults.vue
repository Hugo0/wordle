<script setup lang="ts">
import { Share2, Check } from 'lucide-vue-next';

const lang = useLanguageStore();

const shareCopied = ref(false);
let shareTimer: ReturnType<typeof setTimeout> | null = null;

const emit = defineEmits<{
    playAgain: [];
    share: [];
    close: [];
}>();

function onShareClick() {
    emit('share');
    shareCopied.value = true;
    if (shareTimer) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => {
        shareCopied.value = false;
    }, 2000);
}

defineProps<{
    visible: boolean;
    solved: number;
    failed: number;
    avgGuesses: string;
    avgTime: string;
    score: number;
    maxCombo: number;
    words: Array<{ word: string; guesses: number; points?: number }>;
    lastMissedWord: string;
}>();
</script>

<template>
    <BaseModal :visible="visible" size="sm" @close="$emit('close')">
        <h2 class="heading-section text-2xl text-center text-ink mb-1">
            {{ lang.config?.ui?.speed_streak }}
        </h2>
        <p class="text-center text-muted text-sm mb-3">
            {{ lang.config?.ui?.time_up || "Time's up!" }}
        </p>

        <!-- Score -->
        <div class="text-center mb-2">
            <div
                class="font-display font-bold text-ink"
                style="font-size: 48px; font-variation-settings: 'opsz' 72"
            >
                {{ score.toLocaleString() }}
            </div>
            <div class="mono-label-md">{{ lang.config?.ui?.points }}</div>
        </div>

        <div class="grid grid-cols-4 gap-2 mb-4 text-center editorial-rule pb-4">
            <div>
                <div class="font-display font-bold text-lg text-correct">{{ solved }}</div>
                <div class="mono-label">{{ lang.config?.ui?.solved }}</div>
            </div>
            <div>
                <div class="font-display font-bold text-lg text-ink">{{ maxCombo }}x</div>
                <div class="mono-label">{{ lang.config?.ui?.combo }}</div>
            </div>
            <div>
                <div class="font-display font-bold text-lg text-ink">{{ avgGuesses }}</div>
                <div class="mono-label">{{ lang.config?.ui?.avg_guesses }}</div>
            </div>
            <div>
                <div class="font-display font-bold text-lg text-accent">{{ failed }}</div>
                <div class="mono-label">{{ lang.config?.ui?.failed }}</div>
            </div>
        </div>

        <!-- Last missed word -->
        <div v-if="lastMissedWord" class="text-center mb-3 py-2 editorial-rule">
            <div class="mono-label mb-1">{{ lang.config?.ui?.the_word_was }}</div>
            <div class="font-display font-bold text-lg uppercase text-accent">
                {{ lastMissedWord }}
            </div>
        </div>

        <div v-if="words.length" class="mb-4">
            <h3 class="mono-label mb-2">{{ lang.config?.ui?.words_solved }}</h3>
            <div class="flex flex-wrap gap-1">
                <span
                    v-for="(w, i) in words"
                    :key="i"
                    class="px-2 py-0.5 bg-correct-soft text-correct text-xs font-medium uppercase"
                >
                    {{ w.word }} ({{ w.guesses }})
                </span>
            </div>
        </div>

        <!-- Action buttons — matches StatsModal pattern -->
        <div class="flex gap-3" style="padding: 20px 0 0">
            <button
                class="flex-1 py-3 px-5 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer inline-flex items-center justify-center gap-2"
                @click="onShareClick"
            >
                <template v-if="shareCopied">
                    <Check :size="16" />
                    {{ lang.config?.text?.copied }}
                </template>
                <template v-else>
                    <Share2 :size="16" />
                    {{ lang.config?.ui?.share_result }}
                </template>
            </button>
            <button
                class="flex-1 py-3 px-3 border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                @click="$emit('playAgain')"
            >
                {{ lang.config?.ui?.play_again }}
            </button>
        </div>
    </BaseModal>
</template>
