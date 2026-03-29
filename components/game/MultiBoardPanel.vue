<template>
    <div
        class="relative transition-colors w-full h-full min-h-0"
        :class="[
            singleBoard ? '' : 'rounded-lg border-2',
            !singleBoard && board.solved ? 'bg-correct-soft border-correct' : 'border-transparent',
        ]"
    >
        <div
            ref="boardEl"
            role="grid"
            :aria-label="singleBoard ? 'Wordle game grid' : `Board ${boardIndex + 1}`"
            class="game-board grid relative w-full h-full box-border"
            :class="singleBoard ? 'gap-1 p-3' : 'gap-0.5 p-1'"
            :style="{ gridTemplateRows: gridRowsStyle }"
        >
            <!-- Tile rows -->
            <GameTileRow
                v-for="(row, i) in visibleRows"
                :key="row.index"
                :tiles="board.tilesVisual[row.index]!"
                :classes="board.tileClassesVisual[row.index] || []"
                :shaking="game.shakingRow === row.index && !board.solved"
                :rtl="langStore.rightToLeft"
            />

            <!-- Remaining guesses count (only in collapsed mode) -->
            <div v-if="shouldCollapse && remainingGuesses > 0" class="remaining-label">
                {{ remainingGuesses }} left
            </div>
        </div>
        <!-- Solved overlay -->
        <Transition name="fade">
            <div
                v-if="!singleBoard && board.solved"
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
const props = withDefaults(
    defineProps<{
        boardIndex: number;
        singleBoard?: boolean;
        /** Max visible tile rows (0 = show all) */
        maxVisibleRows?: number;
    }>(),
    { singleBoard: false, maxVisibleRows: 0 }
);

const game = useGameStore();
const langStore = useLanguageStore();

const board = computed(() => game.boards[props.boardIndex]!);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

const shouldCollapse = computed(() => {
    if (props.singleBoard) return false;
    if (props.maxVisibleRows <= 0) return false;
    return maxGuesses.value > props.maxVisibleRows;
});

/** Which rows to render */
const visibleRows = computed(() => {
    const total = maxGuesses.value;
    if (!shouldCollapse.value) {
        return Array.from({ length: total }, (_, i) => ({ index: i }));
    }
    // Always show exactly maxVisibleRows rows
    // Show the most recent filled rows + active row, capped at maxVisibleRows
    const activeRow = board.value.activeRow;
    // Start from the end of filled content, show maxVisibleRows rows
    const endRow = Math.min(Math.max(activeRow + 1, filledRowCount.value), total);
    const startRow = Math.max(0, endRow - props.maxVisibleRows);
    const rows: { index: number }[] = [];
    for (let i = startRow; i < Math.min(startRow + props.maxVisibleRows, total); i++) {
        rows.push({ index: i });
    }
    return rows;
});

/** Number of rows with content */
const filledRowCount = computed(() => {
    if (!shouldCollapse.value) return 0;
    const tiles = board.value.tilesVisual;
    let count = 0;
    for (let i = 0; i < tiles.length; i++) {
        if (tiles[i]!.some((t) => t !== '')) count = i + 1;
    }
    return count;
});

/** How many guesses remain */
const remainingGuesses = computed(() => {
    if (props.singleBoard || board.value.solved) return 0;
    return Math.max(0, maxGuesses.value - board.value.activeRow - 1);
});

const gridRowsStyle = computed(() => {
    const rowCount = visibleRows.value.length;
    const hasRemaining = shouldCollapse.value && remainingGuesses.value > 0;
    if (hasRemaining) {
        // Tile rows + remaining label (label takes 1fr like a tile row)
        return `repeat(${rowCount}, minmax(0, 1fr)) minmax(0, 1fr)`;
    }
    return `repeat(${rowCount}, minmax(0, 1fr))`;
});

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

.remaining-label {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    font-size: 9px;
    color: var(--color-muted, #8c8c8c);
    letter-spacing: 0.08em;
}
</style>
