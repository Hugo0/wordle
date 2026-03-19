<template>
    <label class="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            role="switch"
            class="sr-only peer"
            :checked="modelValue"
            :aria-label="label"
            @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />
        <div
            class="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:bg-green-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
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
