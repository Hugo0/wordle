<!--
    Ranked list of best starting words. Shared by the full /best-starting-words
    strategy page and the compact BestStartingWordsPanel embedded below the
    game board.
-->
<script setup lang="ts">
interface TopWord {
    word: string;
    coverageScore: number;
}

withDefaults(
    defineProps<{
        words: TopWord[];
        /** Max-width wrapper — the embedded panel constrains the list, the
         * full strategy page does not. */
        compact?: boolean;
    }>(),
    { compact: false }
);
</script>

<template>
    <div class="border border-rule divide-y divide-rule" :class="compact ? 'max-w-md mx-auto' : ''">
        <div
            v-for="(w, i) in words"
            :key="w.word"
            class="flex items-center gap-4 px-5 py-3"
            :class="i < 3 ? 'bg-paper-warm' : ''"
        >
            <span
                class="w-7 h-7 flex items-center justify-center border border-rule font-display font-bold text-sm text-ink flex-shrink-0"
                :class="i < 3 ? 'bg-paper' : 'bg-paper-warm'"
            >
                {{ i + 1 }}
            </span>
            <div class="grid grid-cols-5 gap-1 max-w-[180px] flex-1">
                <div
                    v-for="(c, j) in w.word.split('')"
                    :key="j"
                    class="tile aspect-square inline-flex justify-center items-center text-sm uppercase font-display font-bold select-none filled"
                >
                    {{ c }}
                </div>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="text-sm font-semibold text-ink tabular-nums">
                    {{ w.coverageScore }}
                </div>
                <div class="mono-label">Coverage</div>
            </div>
        </div>
    </div>
</template>
