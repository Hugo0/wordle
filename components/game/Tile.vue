<template>
    <div
        class="w-full h-full justify-center items-center inline-flex"
        :class="tileClass"
        v-html="letter"
    />
</template>

<script setup lang="ts">
defineProps<{
    letter: string;
    tileClass: string;
}>();
</script>
