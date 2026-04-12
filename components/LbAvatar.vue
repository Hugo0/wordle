<template>
    <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="username"
        :class="[sizeClass, 'rounded-full object-cover flex-shrink-0']"
        referrerpolicy="no-referrer"
    />
    <div
        v-else
        :class="[sizeClass, fontSize, 'rounded-full bg-rule text-muted flex items-center justify-center font-display font-bold flex-shrink-0']"
    >
        {{ initial }}
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    username: string;
    avatarUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
}>(), {
    avatarUrl: null,
    size: 'md',
});

const sizeClass = computed(() => {
    if (props.size === 'sm') return 'w-7 h-7';
    if (props.size === 'lg') return 'w-12 h-12';
    return 'w-8 h-8';
});
const fontSize = computed(() => (props.size === 'lg' ? 'text-base' : 'text-xs'));
const initial = computed(() => props.username.charAt(0).toUpperCase());
</script>
