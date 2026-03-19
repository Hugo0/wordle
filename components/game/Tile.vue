<template>
    <div
        class="w-full h-full justify-center items-center inline-flex"
        :class="tileClass"
        :aria-label="ariaLabel"
        role="gridcell"
    >
        {{ letter }}
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    letter: string;
    tileClass: string;
}>();

const ariaLabel = computed(() => {
    if (!props.letter) return 'Empty';
    const state =
        props.tileClass.includes('correct') && !props.tileClass.includes('semicorrect')
            ? ', correct position'
            : props.tileClass.includes('semicorrect')
              ? ', wrong position'
              : props.tileClass.includes('incorrect')
                ? ', not in word'
                : '';
    return `${props.letter}${state}`;
});
</script>
