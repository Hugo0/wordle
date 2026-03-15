<template>
    <div
        v-show="visible"
        class="opacity-25 fixed top-0 left-0 w-full h-full z-1 bg-black"
        @click="$emit('close')"
    />
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();
</script>
