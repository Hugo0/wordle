<template>
    <main class="flex flex-auto justify-center items-center">
        <div
            ref="boardEl"
            class="game-board grid grid-rows-6 relative w-full h-full max-w-[350px] max-h-[420px] gap-1 p-3 box-border"
        >
            <GameTileRow
                v-for="(row, i) in game.tilesVisual"
                :key="i"
                :tiles="row"
                :classes="game.tileClassesVisual[i] || []"
                :shaking="game.shakingRow === i"
            />
        </div>
    </main>
</template>

<script setup lang="ts">
const game = useGameStore();
const boardEl = ref<HTMLElement | null>(null);

defineExpose({ boardEl });
</script>
