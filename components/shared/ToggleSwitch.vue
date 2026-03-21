<template>
    <label class="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            role="switch"
            class="sr-only peer"
            :checked="modelValue"
            :aria-label="label || undefined"
            @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <div
            class="w-11 h-6 rounded-full peer transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
            style="background-color: var(--color-muted-soft)"
        />
    </label>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: boolean;
    label?: string;
}>();
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<style scoped>
.peer:checked + div {
    background-color: var(--color-correct) !important;
}
</style>
