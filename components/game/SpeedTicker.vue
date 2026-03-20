<script setup lang="ts">
const props = defineProps<{
    words: Array<{ word: string; guesses: number }>;
}>();

const tickerEl = ref<HTMLElement | null>(null);

watch(
    () => props.words.length,
    () => {
        nextTick(() => {
            if (tickerEl.value) {
                tickerEl.value.scrollLeft = tickerEl.value.scrollWidth;
            }
        });
    }
);
</script>

<template>
    <div ref="tickerEl" class="flex gap-1.5 overflow-x-auto px-3 py-1 scrollbar-hide">
        <span
            v-for="(word, i) in words"
            :key="i"
            class="speed-ticker-word shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
            :class="
                word.guesses <= 2
                    ? 'bg-correct text-white'
                    : word.guesses <= 4
                      ? 'bg-correct/80 text-white'
                      : 'bg-correct/60 text-paper'
            "
        >
            {{ word.word }} ({{ word.guesses }})
        </span>
    </div>
</template>

<style scoped>
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
</style>
