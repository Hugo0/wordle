<script setup lang="ts">
import { X, Share2 } from 'lucide-vue-next';

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

defineEmits<{
    playAgain: [];
    share: [];
    close: [];
}>();
</script>

<template>
    <Transition name="fade">
        <div
            v-if="visible"
            class="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] px-4 overflow-y-auto pb-8"
        >
            <!-- Backdrop — click to close -->
            <div class="fixed inset-0 bg-ink/30" @click="$emit('close')" />

            <div
                class="relative bg-paper border border-rule shadow-xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto z-10 modal-animate"
                @keydown.escape="$emit('close')"
            >
                <!-- Close button -->
                <button
                    class="absolute top-3 right-3 p-1 text-muted hover:text-ink transition-colors"
                    @click="$emit('close')"
                >
                    <X :size="20" />
                </button>

                <h2 class="heading-section text-2xl text-center text-ink mb-1">Speed Streak</h2>
                <p class="text-center text-muted text-sm mb-3">Time's up!</p>

                <!-- Score -->
                <div class="text-center mb-2">
                    <div
                        class="font-display font-bold text-ink"
                        style="font-size: 48px; font-variation-settings: 'opsz' 72"
                    >
                        {{ score.toLocaleString() }}
                    </div>
                    <div class="mono-label-md">Points</div>
                </div>

                <div class="grid grid-cols-4 gap-2 mb-4 text-center editorial-rule pb-4">
                    <div>
                        <div class="font-display font-bold text-lg text-correct">{{ solved }}</div>
                        <div class="mono-label">Solved</div>
                    </div>
                    <div>
                        <div class="font-display font-bold text-lg text-ink">{{ maxCombo }}x</div>
                        <div class="mono-label">Combo</div>
                    </div>
                    <div>
                        <div class="font-display font-bold text-lg text-ink">{{ avgGuesses }}</div>
                        <div class="mono-label">Avg</div>
                    </div>
                    <div>
                        <div class="font-display font-bold text-lg text-accent">{{ failed }}</div>
                        <div class="mono-label">Failed</div>
                    </div>
                </div>

                <!-- Last missed word -->
                <div v-if="lastMissedWord" class="text-center mb-3 py-2 editorial-rule">
                    <div class="mono-label mb-1">The word was</div>
                    <div class="font-display font-bold text-lg uppercase text-accent">
                        {{ lastMissedWord }}
                    </div>
                </div>

                <div v-if="words.length" class="mb-4">
                    <h3 class="mono-label mb-2">Words Solved</h3>
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
                        @click="$emit('share')"
                    >
                        <Share2 :size="16" />
                        Share
                    </button>
                    <button
                        class="flex-1 py-3 px-3 border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                        @click="$emit('playAgain')"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
