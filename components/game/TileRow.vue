<template>
    <div
        role="row"
        class="grid grid-cols-5 gap-1 w-full"
        :class="{ shake: shaking }"
        :style="rtl ? { direction: 'rtl' } : undefined"
    >
        <GameTile
            v-for="(letter, j) in tiles"
            :key="j"
            :letter="letter"
            :tile-class="classes[j] || ''"
        />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    tiles: string[];
    classes: string[];
    shaking: boolean;
    rtl?: boolean;
}>();
</script>
