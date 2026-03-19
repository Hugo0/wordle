<template>
    <main id="game-board" tabindex="-1" class="flex flex-auto justify-center items-center">
        <div
            ref="boardEl"
            role="grid"
            aria-label="Wordle game grid"
            class="game-board grid grid-rows-6 relative w-full h-full max-w-[350px] max-h-[420px] gap-1 p-3 box-border"
        >
            <GameTileRow
                v-for="(row, i) in game.tilesVisual"
                :key="i"
                :tiles="row"
                :classes="game.tileClassesVisual[i] || []"
                :shaking="game.shakingRow === i"
                :rtl="langStore.rightToLeft"
            />
        </div>
        <!-- Screen reader announcements for guess results -->
        <div class="sr-only" aria-live="polite" aria-atomic="true">
            {{ game.srAnnouncement }}
        </div>
    </main>
</template>

<script setup lang="ts">
const game = useGameStore();
const langStore = useLanguageStore();
const boardEl = ref<HTMLElement | null>(null);

defineExpose({ boardEl });
</script>
