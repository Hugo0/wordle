<template>
    <button
        class="flex-1 rounded uppercase text-sm font-bold p-1 sm:p-2 h-14 key"
        :class="[state, { 'has-hint': hint, 'hint-above': hintAbove }]"
        :data-char="char"
        :aria-label="char"
        @click="$emit('press', char)"
    >
        <span v-if="hintAbove && hint" class="key-hint">{{ hint }}</span>
        <span class="key-main">{{ char }}</span>
        <span v-if="!hintAbove && hint" class="key-hint">{{ hint }}</span>
    </button>
</template>

<script setup lang="ts">
defineProps<{
    char: string;
    state: string;
    hint?: string;
    hintAbove?: boolean;
}>();

defineEmits<{ press: [key: string] }>();
</script>
