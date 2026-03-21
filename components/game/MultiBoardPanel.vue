<template>
    <div
        class="relative rounded-lg border-2 transition-colors w-full h-full min-h-0"
        :class="board.solved ? 'bg-correct-soft border-correct' : 'border-transparent'"
    >
        <div
            ref="boardEl"
            role="grid"
            :aria-label="`Board ${boardIndex + 1}`"
            class="game-board grid relative w-full h-full gap-0.5 p-1 box-border"
            :style="{ gridTemplateRows: `repeat(${maxGuesses}, minmax(0, 1fr))` }"
        >
            <GameTileRow
                v-for="(row, i) in board.tilesVisual"
                :key="i"
                :tiles="row"
                :classes="board.tileClassesVisual[i] || []"
                :shaking="game.shakingRow === i && !board.solved"
                :rtl="langStore.rightToLeft"
            />
        </div>
        <!-- Solved overlay -->
        <Transition name="fade">
            <div
                v-if="board.solved"
                class="absolute inset-0 flex items-center justify-center bg-paper/60 rounded-lg pointer-events-none"
            >
                <span class="text-lg font-bold text-correct">
                    Solved in {{ board.solvedAtGuess }}
                </span>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    boardIndex: number;
}>();

const game = useGameStore();
const langStore = useLanguageStore();

const board = computed(() => game.boards[props.boardIndex]!);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

const boardEl = ref<HTMLElement | null>(null);

defineExpose({ boardEl });
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
