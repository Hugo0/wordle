<script setup lang="ts">
defineProps<{
    solved: number;
    failed: number;
    avgGuesses: string;
    avgTime: string;
}>();
</script>

<template>
    <div class="flex justify-center gap-4 px-3 py-1 text-xs">
        <span
            ><strong class="text-lg">{{ solved }}</strong> solved</span
        >
        <span v-if="failed > 0"
            ><strong class="text-lg text-accent">{{ failed }}</strong> failed</span
        >
        <span
            ><strong class="text-lg">{{ avgGuesses }}</strong> avg</span
        >
        <span
            ><strong class="text-lg">{{ avgTime }}s</strong> per word</span
        >
    </div>
</template>
