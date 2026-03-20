<template>
    <div v-show="visible" class="fixed inset-0 z-1 bg-ink/25" @click="$emit('close')" />
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();
</script>
