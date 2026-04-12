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
            :class="
                layout.scrollable || allExpanded
                    ? 'overflow-y-auto scroll-snap-y editorial-scroll'
                    : 'flex justify-center items-center'
            "
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
                    class="snap-start"
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
                    :class="{ 'expand-pulse': expandBtnPulse }"
                    :aria-label="allExpanded ? 'Collapse boards' : 'Expand all boards'"
                    @click="toggleExpand()"
                >
                    <Minimize2 v-if="allExpanded" :size="14" />
                    <Maximize2 v-else :size="14" />
                </button>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { nextTick } from 'vue';
import { X, Maximize2, Minimize2 } from 'lucide-vue-next';
import { useMultiBoardLayout } from '~/composables/useMultiBoardLayout';

const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

// --- Focus mode ---
const focusedBoard = ref<number | null>(null);
const allExpanded = ref(false);
const expandBtnPulse = ref(false);

// Auto-expand when user fills all visible rows (rows start scrolling off top)
watch(
    () => {
        const firstUnsolved = game.boards.find((b) => !b.solved);
        return firstUnsolved?.activeRow ?? 0;
    },
    (activeRow) => {
        if (allExpanded.value || layout.value.visibleRows <= 0) return;
        if (activeRow >= layout.value.visibleRows) {
            allExpanded.value = true;
            // Pulse the collapse button so user knows how to go back
            expandBtnPulse.value = true;
            setTimeout(() => {
                expandBtnPulse.value = false;
            }, 2000);
        }
    }
);

/** Toggle expand and preserve scroll position */
function toggleExpand() {
    // Find which board is currently near the top of the viewport
    let anchorIdx = 0;
    for (let i = 0; i < boardCount.value; i++) {
        const el = document.getElementById('board-' + i);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top >= -50) {
                anchorIdx = i;
                break;
            }
        }
    }
    allExpanded.value = !allExpanded.value;
    // After Vue re-renders, scroll back to the anchor board
    nextTick(() => {
        const el = document.getElementById('board-' + anchorIdx);
        el?.scrollIntoView({ block: 'start' });
    });
}

// 0-based board indices
const boardIndices = computed(() => Array.from({ length: boardCount.value }, (_, i) => i));

function onThumbnailClick(boardIndex: number) {
    // Always scroll to the board
    const el = document.getElementById('board-' + boardIndex);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Track visible boards via IntersectionObserver so typing only syncs those.
// Unlike the old static approach, this updates live as the user scrolls.
let intersectionObserver: IntersectionObserver | null = null;
const visibleBoards = new Set<number>();

onMounted(() => {
    if (boardCount.value <= 4) return; // no need for small board counts

    intersectionObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                const id = parseInt((entry.target as HTMLElement).id.replace('board-', ''), 10);
                if (isNaN(id)) continue;
                if (entry.isIntersecting) {
                    visibleBoards.add(id);
                } else {
                    visibleBoards.delete(id);
                }
            }
            game.setVisibleBoardIndices([...visibleBoards]);
        },
        { threshold: 0.1 }
    );

    // Observe after DOM renders
    nextTick(() => {
        for (let i = 0; i < boardCount.value; i++) {
            const el = document.getElementById('board-' + i);
            if (el) intersectionObserver!.observe(el);
        }
    });
});

onBeforeUnmount(() => {
    intersectionObserver?.disconnect();
});

// --- Grid sizing ---
const GRID_GAP = 6;

const gridStyle = computed(() => {
    const cols = layout.value.gridCols;
    const boardRows = Math.ceil(boardCount.value / cols);

    const effectiveVisibleRows = allExpanded.value ? 0 : layout.value.visibleRows;
    const rowsPerBoard = effectiveVisibleRows > 0 ? effectiveVisibleRows + 1 : maxGuesses.value;

    const totalTileCols = cols * 5;
    const totalTileRows = boardRows * rowsPerBoard;
    const hGaps = (cols - 1) * GRID_GAP;
    const vGaps = (boardRows - 1) * (GRID_GAP * 3);

    // Tile width from container width (CSS padding handled by the container)
    const tileW = (containerWidth.value - hGaps) / totalTileCols;

    // When expanded or scrollable, use width-only sizing (height overflows via scroll).
    // Only constrain by height when collapsed AND non-scrollable (fit in viewport).
    const isEffectivelyScrollable = layout.value.scrollable || allExpanded.value;
    let tileSize: number;
    if (!isEffectivelyScrollable) {
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

// No auto-scroll on solve — user controls navigation via thumbnails or manual scroll.

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

.scroll-snap-y {
    scroll-snap-type: y proximity;
}

.expand-pulse {
    animation: expand-btn-pulse 0.6s ease-in-out 3;
    background: var(--color-ink, #1a1a1a) !important;
    color: var(--color-paper, #faf8f5) !important;
}

@keyframes expand-btn-pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.3);
    }
}
</style>
