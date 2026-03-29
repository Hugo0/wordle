<template>
    <main ref="containerRef" class="flex flex-col flex-auto min-h-0 overflow-hidden">
        <!-- FOCUS MODE -->
        <div
            v-if="focusedBoard !== null"
            class="flex flex-auto justify-center items-center p-2 min-h-0"
        >
            <div class="w-full h-full" style="max-width: 400px; max-height: 520px">
                <GameMultiBoardPanel
                    :ref="(el: any) => setPanelRef(focusedBoard!, el)"
                    :board-index="focusedBoard!"
                    :max-visible-rows="0"
                />
            </div>
        </div>

        <!-- NORMAL MODE -->
        <div v-else class="flex flex-auto justify-center items-center min-h-0 p-1">
            <div class="grid" :style="gridStyle" data-allow-mismatch>
                <GameMultiBoardPanel
                    v-for="i in visibleBoardIndices"
                    :key="i"
                    :ref="(el: any) => setPanelRef(i, el)"
                    :board-index="i"
                    :max-visible-rows="visibleRowsPerBoard"
                />
            </div>
        </div>

        <!-- TOOLBAR -->
        <div v-if="boardCount > 4" class="toolbar shrink-0">
            <div class="toolbar-inner">
                <GameBoardMinimap
                    :current-page="currentPage"
                    :boards-per-page="boardsPerPage"
                    :focused-board="focusedBoard"
                    @jump-to-board="onThumbnailClick"
                />
                <div v-if="totalPages > 1 && focusedBoard === null" class="page-controls">
                    <button
                        class="page-nav-btn"
                        :disabled="currentPage === 0"
                        aria-label="Previous board page"
                        @click="prevPage"
                    >
                        <ChevronLeft :size="14" />
                    </button>
                    <span class="page-indicator">{{ currentPage + 1 }}/{{ totalPages }}</span>
                    <button
                        class="page-nav-btn"
                        :disabled="currentPage >= totalPages - 1"
                        aria-label="Next board page"
                        @click="nextPage"
                    >
                        <ChevronRight :size="14" />
                    </button>
                </div>
                <button
                    v-if="focusedBoard !== null"
                    class="page-nav-btn"
                    aria-label="Close focused board"
                    @click="focusedBoard = null"
                >
                    <X :size="14" />
                </button>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next';

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

// --- Focus mode ---
const focusedBoard = ref<number | null>(null);
function onThumbnailClick(boardIndex: number) {
    focusedBoard.value = focusedBoard.value === boardIndex ? null : boardIndex;
}

// --- Measure container (original approach: JS-computed dimensions for stable layout) ---
const containerRef = ref<HTMLElement | null>(null);
const containerHeight = ref(600);
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            containerHeight.value = entry.contentRect.height;
        }
        windowWidth.value = window.innerWidth;
    });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
});

// --- Dynamic columns: symmetric rows ---
const GRID_GAP = 6;
const MIN_BOARD_W = 100;

const gridCols = computed(() => {
    const bc = boardCount.value;
    if (bc <= 2) return 2;
    if (bc <= 4) return 2;
    const availW = windowWidth.value - 16;
    const maxCols = Math.max(2, Math.floor((availW + GRID_GAP) / (MIN_BOARD_W + GRID_GAP)));
    const cap = Math.min(maxCols, bc);
    for (let c = cap; c >= 2; c--) {
        if (bc % c === 0) return c;
    }
    return 2;
});

// --- Boards per page ---
const boardsPerPage = computed(() => {
    const bc = boardCount.value;
    if (bc <= 4) return bc;
    const cols = gridCols.value;
    const target = cols * 2;
    if (target >= bc) return bc;
    if (bc % target === 0) return target;
    return cols;
});

// --- Visible rows per board: 6 for 8+ board modes ---
const visibleRowsPerBoard = computed(() => {
    if (boardCount.value <= 4) return 0;
    if (maxGuesses.value <= 6) return 0;
    return 6;
});

// --- Pagination ---
const currentPage = ref(0);
const totalPages = computed(() => Math.ceil(boardCount.value / boardsPerPage.value));
watch(boardCount, () => {
    currentPage.value = 0;
});
watch(totalPages, (tp) => {
    if (currentPage.value >= tp) currentPage.value = Math.max(0, tp - 1);
});

const visibleBoardIndices = computed(() => {
    const start = currentPage.value * boardsPerPage.value;
    const end = Math.min(start + boardsPerPage.value, boardCount.value);
    return Array.from({ length: end - start }, (_, i) => start + i);
});

function prevPage() {
    if (currentPage.value > 0) currentPage.value--;
}
function nextPage() {
    if (currentPage.value < totalPages.value - 1) currentPage.value++;
}

// Auto-advance
const solvedCount = computed(() => game.boards.filter((b) => b.solved).length);
watch(solvedCount, () => {
    if (game.gameOver || totalPages.value <= 1) return;
    const s = currentPage.value * boardsPerPage.value;
    const e = Math.min(s + boardsPerPage.value, boardCount.value);
    if (game.boards.slice(s, e).every((b) => b.solved)) {
        for (let p = 0; p < totalPages.value; p++) {
            const ps = p * boardsPerPage.value;
            if (!game.boards.slice(ps, ps + boardsPerPage.value).every((b) => b.solved)) {
                currentPage.value = p;
                return;
            }
        }
    }
});

// --- Keyboard nav ---
function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && focusedBoard.value !== null) {
        focusedBoard.value = null;
        e.preventDefault();
        return;
    }
    if (totalPages.value <= 1 || focusedBoard.value !== null) return;
    if (e.key === 'ArrowLeft') {
        prevPage();
        e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
        nextPage();
        e.preventDefault();
    }
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

// --- Grid sizing: JS-computed dimensions for square tiles (stable, no layout thrash) ---
const gridStyle = computed(() => {
    const cols = gridCols.value;
    const boardRows = Math.ceil(visibleBoardIndices.value.length / cols);
    const toolbarH = boardCount.value > 4 ? 44 : 0;
    const availH = containerHeight.value - toolbarH - 8;
    const availW = windowWidth.value - 16;

    // For dordle, cap height
    const useH =
        boardRows === 1 && boardCount.value <= 2 ? Math.min(availH, availH * 0.55) : availH;

    // Effective rows per board for tile sizing
    const rowsPerBoard =
        visibleRowsPerBoard.value > 0
            ? visibleRowsPerBoard.value + 1 // +1 for "N left" label
            : maxGuesses.value;
    const totalTileRows = boardRows * rowsPerBoard;
    const totalTileCols = cols * 5;
    const hGaps = (cols - 1) * GRID_GAP + 8;
    const vGaps = (boardRows - 1) * GRID_GAP + 4;

    // Tile size: min of height-based and width-based, for square tiles
    const tileSizeH = (useH - vGaps) / totalTileRows;
    const tileSizeW = (availW - hGaps) / totalTileCols;
    const tileSize = Math.max(Math.min(tileSizeH, tileSizeW), 8);

    const maxW = tileSize * totalTileCols + hGaps;
    const maxH = tileSize * totalTileRows + vGaps;

    return {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        maxWidth: `${Math.floor(maxW)}px`,
        maxHeight: `${Math.floor(maxH)}px`,
        height: `${Math.floor(maxH)}px`,
        width: `${Math.floor(maxW)}px`,
        gap: `${GRID_GAP}px`,
    };
});

// --- Board DOM refs ---
const panelRefs = ref<Record<number, { boardEl: HTMLElement | null } | null>>({});
function setPanelRef(index: number, el: { boardEl: HTMLElement | null } | null) {
    if (el) panelRefs.value[index] = el;
}
function getBoardElForIndex(index: number): HTMLElement | null {
    return panelRefs.value[index]?.boardEl ?? null;
}
defineExpose({ getBoardElForIndex });
</script>

<style scoped>
.toolbar {
    width: 100%;
    border-top: 1px solid var(--color-rule, #d4cfc7);
}
.toolbar-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 4px 8px;
    flex-wrap: wrap;
}
.page-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
.page-indicator {
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-muted, #8c8c8c);
    min-width: 28px;
    text-align: center;
}
.page-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--color-rule, #d4cfc7);
    background: var(--color-paper, #faf8f5);
    color: var(--color-ink, #1a1a1a);
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
}
.page-nav-btn:hover:not(:disabled) {
    background: var(--color-ink, #1a1a1a);
    color: var(--color-paper, #faf8f5);
}
.page-nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
}
</style>
