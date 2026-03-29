<template>
    <main ref="containerRef" class="flex flex-col flex-auto min-h-0 overflow-hidden">
        <!-- FOCUS MODE: single board expanded -->
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

        <!-- NORMAL MODE: all boards in scrollable grid -->
        <div
            v-else
            ref="scrollRef"
            class="flex-auto min-h-0 p-1"
            :class="layout.scrollable ? 'overflow-y-auto' : 'flex justify-center items-center'"
            data-allow-mismatch
        >
            <div class="grid mx-auto" :style="gridStyle" data-allow-mismatch>
                <div
                    v-for="idx in boardIndices"
                    :key="idx"
                    :id="'board-' + idx"
                    class="cursor-pointer"
                    @click="onBoardClick(idx)"
                >
                    <GameMultiBoardPanel
                        :ref="(el: any) => setPanelRef(idx, el)"
                        :board-index="idx"
                        :max-visible-rows="layout.visibleRows"
                    />
                </div>
            </div>
        </div>

        <!-- TOOLBAR: minimap + scroll nav + expand button -->
        <div v-if="boardCount > 4" class="toolbar shrink-0">
            <div class="toolbar-inner">
                <GameBoardMinimap
                    :current-page="0"
                    :boards-per-page="boardCount"
                    :focused-board="focusedBoard"
                    @jump-to-board="onThumbnailClick"
                />
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
import { X } from 'lucide-vue-next';
import { useMultiBoardLayout } from '~/composables/useMultiBoardLayout';

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

// --- Focus mode ---
const focusedBoard = ref<number | null>(null);

// 0-based board indices
const boardIndices = computed(() => Array.from({ length: boardCount.value }, (_, i) => i));

function onThumbnailClick(boardIndex: number) {
    if (focusedBoard.value === boardIndex) {
        focusedBoard.value = null;
    } else if (layout.value.scrollable && focusedBoard.value === null) {
        // Scroll to that board instead of focusing
        const el = document.getElementById('board-' + boardIndex);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        focusedBoard.value = boardIndex;
    }
}

function onBoardClick(boardIndex: number) {
    if (boardCount.value > 4) {
        focusedBoard.value = boardIndex;
    }
}

// --- Measure container ---
const containerRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
const containerWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
const containerHeight = ref(600);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            containerWidth.value = entry.contentRect.width;
            containerHeight.value = entry.contentRect.height;
        }
    });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
});

// --- Layout composable ---
const layout = useMultiBoardLayout(boardCount, maxGuesses, containerWidth);

// --- Grid sizing ---
const GRID_GAP = 6;

const gridStyle = computed(() => {
    const cols = layout.value.gridCols;
    const boardRows = Math.ceil(boardCount.value / cols);
    const availW = containerWidth.value - 16;

    const rowsPerBoard =
        layout.value.visibleRows > 0
            ? layout.value.visibleRows + 1 // +1 for "N left" label
            : maxGuesses.value;

    const totalTileCols = cols * 5;
    const totalTileRows = boardRows * rowsPerBoard;
    const hGaps = (cols - 1) * GRID_GAP + 8;
    const vGaps = (boardRows - 1) * GRID_GAP + 4;

    const tileW = (availW - hGaps) / totalTileCols;

    // For non-scrollable (dordle/quordle): constrain by both width and height
    let tileSize: number;
    if (!layout.value.scrollable) {
        const toolbarH = boardCount.value > 4 ? 44 : 0;
        const availH = containerHeight.value - toolbarH - 8;
        const tileH = (availH - vGaps) / totalTileRows;
        tileSize = Math.min(tileW, tileH);
    } else {
        tileSize = tileW;
    }

    tileSize = Math.max(tileSize, 12);

    const maxW = tileSize * totalTileCols + hGaps;
    const gridH = tileSize * totalTileRows + vGaps;

    // Explicit pixel height is critical: without it, CSS grid 1fr rows
    // collapse to content height, which is 0 for empty tiles (no text).
    // With a fixed height, each 1fr row gets height/N px and tiles fill it.
    return {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        maxWidth: `${Math.floor(maxW)}px`,
        width: `${Math.floor(maxW)}px`,
        height: `${Math.floor(gridH)}px`,
        gap: `${GRID_GAP}px`,
    };
});

// --- Auto-scroll to active board on solve ---
const solvedCount = computed(() => game.boards.filter((b) => b.solved).length);
watch(solvedCount, () => {
    if (game.gameOver || !layout.value.scrollable || focusedBoard.value !== null) return;
    // Find first unsolved board and scroll to it
    const firstUnsolved = game.boards.findIndex((b) => !b.solved);
    if (firstUnsolved >= 0) {
        nextTick(() => {
            const el = document.getElementById('board-' + firstUnsolved);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
});

// --- Keyboard nav ---
function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && focusedBoard.value !== null) {
        focusedBoard.value = null;
        e.preventDefault();
    }
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

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
</style>
