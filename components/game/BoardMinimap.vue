<template>
    <div
        class="flex items-center gap-0.5 py-1 px-1 shrink-0 overflow-x-auto justify-center minimap-scroll"
    >
        <button
            v-for="i in boardCount"
            :key="i - 1"
            class="minimap-board shrink-0"
            :class="{
                'minimap-current': isOnCurrentPage(i - 1) && focusedBoard === null,
                'minimap-focused': focusedBoard === i - 1,
                'minimap-solved': game.boards[i - 1]?.solved,
            }"
            :aria-label="`Board ${i}${game.boards[i - 1]?.solved ? ' (solved)' : ''}`"
            @click="$emit('jumpToBoard', i - 1)"
        >
            <!-- Tiny grid of colored squares -->
            <div class="minimap-grid">
                <div v-for="row in miniRows(i - 1)" :key="row.index" class="minimap-row">
                    <span
                        v-for="(color, ci) in row.colors"
                        :key="ci"
                        class="minimap-cell"
                        :class="color"
                    />
                </div>
            </div>
            <span class="minimap-label">{{ i }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    currentPage: number;
    boardsPerPage: number;
    focusedBoard: number | null;
}>();

defineEmits<{ jumpToBoard: [boardIndex: number] }>();

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);

function isOnCurrentPage(boardIndex: number): boolean {
    const start = props.currentPage * props.boardsPerPage;
    const end = start + props.boardsPerPage;
    return boardIndex >= start && boardIndex < end;
}

function miniRows(boardIndex: number) {
    const board = game.boards[boardIndex];
    if (!board) return [];

    const rows: { index: number; colors: string[] }[] = [];
    const maxShow = 6;

    for (let r = 0; r < board.tileClassesVisual.length && rows.length < maxShow; r++) {
        const classes = board.tileClassesVisual[r];
        if (!classes || !board.tilesVisual[r]?.some((t) => t !== '')) continue;

        const colors = classes.map((cls) => {
            // Check incorrect FIRST — "incorrect" contains "correct" as substring
            if (cls.includes('incorrect')) return 'mc-incorrect';
            if (cls.includes('semicorrect')) return 'mc-semi';
            if (cls.includes('correct')) return 'mc-correct';
            return 'mc-empty';
        });
        rows.push({ index: r, colors });
    }

    return rows;
}
</script>

<style scoped>
.minimap-board {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
    min-width: 18px;
}
.minimap-board:hover {
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-current {
    border-color: var(--color-rule, #d4cfc7);
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-focused {
    border-color: var(--color-ink, #1a1a1a);
    background: var(--color-paper-warm, #f3efe8);
}
.minimap-solved {
    opacity: 0.6;
}
.minimap-solved .minimap-label {
    color: var(--color-correct);
}

.minimap-grid {
    display: flex;
    flex-direction: column;
    gap: 1px;
}
.minimap-row {
    display: flex;
    gap: 1px;
}
.minimap-cell {
    width: 3px;
    height: 3px;
    border-radius: 0.5px;
}
.mc-correct {
    background: var(--color-correct);
}
.mc-semi {
    background: var(--color-semicorrect);
}
.mc-incorrect {
    background: var(--color-key-absent, #8c8c8c);
}
.mc-empty {
    background: var(--color-rule, #d4cfc7);
}

.minimap-label {
    font-family: var(--font-mono, monospace);
    font-size: 7px;
    font-weight: 600;
    color: var(--color-muted, #8c8c8c);
    line-height: 1;
}
.minimap-focused .minimap-label {
    color: var(--color-ink, #1a1a1a);
}
.minimap-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
}
.minimap-scroll::-webkit-scrollbar {
    display: none;
}
</style>
