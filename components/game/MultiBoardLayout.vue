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
            class="flex-auto min-h-0 px-1 sm:px-3 lg:px-6 py-1"
            :class="layout.scrollable ? 'overflow-y-auto' : 'flex justify-center items-center'"
            @scroll.passive="onBoardScroll"
            data-allow-mismatch
        >
            <!-- Skeleton: 4 placeholder boards while measuring container -->
            <div
                v-if="!measured"
                class="grid grid-cols-2 gap-3 mx-auto opacity-15 animate-pulse py-4"
                style="width: 80%; max-width: 500px"
            >
                <div v-for="i in 4" :key="i" class="bg-rule rounded-sm" style="aspect-ratio: 5/7" />
            </div>

            <div v-else class="grid mx-auto max-w-full" :style="gridStyle" data-allow-mismatch>
                <div
                    v-for="idx in boardIndices"
                    :key="idx"
                    :id="'board-' + idx"
                    @click="onBoardClick(idx)"
                >
                    <GameMultiBoardPanel
                        :ref="(el: any) => setPanelRef(idx, el)"
                        :board-index="idx"
                        :max-visible-rows="allExpanded ? 0 : layout.visibleRows"
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
                <button
                    v-else-if="layout.visibleRows > 0"
                    class="page-nav-btn shrink-0"
                    :aria-label="allExpanded ? 'Collapse boards' : 'Expand all boards'"
                    @click="allExpanded = !allExpanded"
                >
                    <Minimize2 v-if="allExpanded" :size="14" />
                    <Maximize2 v-else :size="14" />
                </button>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { X, Maximize2, Minimize2 } from 'lucide-vue-next';
import { useMultiBoardLayout } from '~/composables/useMultiBoardLayout';

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

// --- Focus mode ---
const focusedBoard = ref<number | null>(null);
const allExpanded = ref(false);

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

function onBoardClick(_boardIndex: number) {
    // Focus mode disabled — too buggy. Boards are always visible.
    // TODO: re-enable when focus mode UX is polished.
}

// --- Measure container ---
const containerRef = ref<HTMLElement | null>(null);
const scrollRef = ref<HTMLElement | null>(null);
// null until measured — grid hidden until we know the real size (no layout shift)
const containerWidth = ref<number | null>(null);
const containerHeight = ref(600);
const measured = computed(() => containerWidth.value !== null);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    // Measure scrollRef (padded inner div where grid lives), not containerRef
    // (outer <main> without padding). Ensures containerWidth matches actual
    // available space, preventing horizontal overflow.
    if (scrollRef.value) {
        const cs = getComputedStyle(scrollRef.value);
        containerWidth.value =
            scrollRef.value.clientWidth - parseInt(cs.paddingLeft) - parseInt(cs.paddingRight);
        containerHeight.value = scrollRef.value.clientHeight;
    }
    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            containerWidth.value = entry.contentRect.width;
            containerHeight.value = entry.contentRect.height;
        }
    });
    if (scrollRef.value) resizeObserver.observe(scrollRef.value);
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
});

// --- Layout composable ---
const layout = useMultiBoardLayout(boardCount, maxGuesses, containerWidth);

// Tell the game store which boards are visible so typing only syncs those.
// For scrollable layouts, all boards are rendered but we approximate visibility
// as the first screenful (gridCols × 2 rows). Full sync happens on scroll stop.
watch(
    [() => layout.value.gridCols, boardCount],
    () => {
        const cols = layout.value.gridCols;
        const visibleCount = Math.min(cols * 2, boardCount.value);
        game.setVisibleBoardIndices(Array.from({ length: visibleCount }, (_, i) => i));
    },
    { immediate: true }
);

// On scroll, update which boards are visible
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
function onBoardScroll() {
    // During scroll, don't update visible set (avoid reactive churn)
    // On scroll stop, sync all boards to catch up
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        game.showTilesAllBoards();
    }, 200);
}
onBeforeUnmount(() => {
    if (scrollTimer) clearTimeout(scrollTimer);
});

// --- Grid sizing ---
const GRID_GAP = 6;

const gridStyle = computed(() => {
    const cols = layout.value.gridCols;
    const boardRows = Math.ceil(boardCount.value / cols);

    const rowsPerBoard =
        layout.value.visibleRows > 0 ? layout.value.visibleRows + 1 : maxGuesses.value;

    const totalTileCols = cols * 5;
    const totalTileRows = boardRows * rowsPerBoard;
    const hGaps = (cols - 1) * GRID_GAP;
    const vGaps = (boardRows - 1) * (GRID_GAP * 3);

    // Tile width from container width (CSS padding handled by the container)
    const tileW = (containerWidth.value - hGaps) / totalTileCols;

    // For non-scrollable modes: also constrain by available height
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

    const gridW = tileSize * totalTileCols + hGaps;
    const gridH = tileSize * totalTileRows + vGaps;

    // Comfortable side margins: tight on mobile, generous on desktop
    const marginPct = containerWidth.value < 640 ? 0.99 : 0.9;
    const cappedW = Math.min(gridW, containerWidth.value * marginPct);

    return {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${boardRows}, minmax(0, 1fr))`,
        maxWidth: `${Math.floor(cappedW)}px`,
        width: `${Math.floor(cappedW)}px`,
        height: `${Math.floor(gridH)}px`,
        gap: `${GRID_GAP}px`,
        rowGap: `${GRID_GAP * 3}px`,
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
    gap: 4px;
    padding: 4px 8px;
    margin: 0 auto;
    max-width: 600px;
    overflow: hidden;
    min-width: 0;
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
