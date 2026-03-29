<template>
    <main id="game-board" tabindex="-1" class="flex flex-auto justify-center items-center">
        <div class="w-full h-full max-w-[min(350px,90vw)] max-h-[min(420px,50vh)]">
            <GameMultiBoardPanel ref="panelRef" :board-index="0" :single-board="true" />
        </div>
        <!-- Screen reader announcements for guess results -->
        <div class="sr-only" aria-live="polite" aria-atomic="true">
            {{ game.srAnnouncement }}
        </div>
    </main>
</template>

<script setup lang="ts">
const game = useGameStore();

const panelRef = ref<{ boardEl: HTMLElement | null } | null>(null);
const boardEl = computed(() => panelRef.value?.boardEl ?? null);

defineExpose({ boardEl });
</script>
