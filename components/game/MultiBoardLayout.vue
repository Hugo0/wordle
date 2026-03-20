<template>
    <main ref="containerRef" class="flex flex-auto justify-center items-center overflow-hidden">
        <div class="grid grid-cols-2 gap-1 p-2 w-full" :style="gridStyle">
            <GameMultiBoardPanel
                v-for="i in boardCount"
                :key="i - 1"
                :ref="(el: any) => setPanelRef(i - 1, el)"
                :board-index="i - 1"
            />
            <!-- Tridle: empty 4th cell keeps grid symmetric -->
            <div v-if="boardCount === 3" aria-hidden="true" />
        </div>
    </main>
</template>

<script setup lang="ts">
const game = useGameStore();
const boardCount = computed(() => game.gameConfig.boardCount);
const maxGuesses = computed(() => game.gameConfig.maxGuesses);

// Number of visual rows in the grid layout
const gridRows = computed(() => (boardCount.value <= 2 ? 1 : 2));

// Measure available height and compute max-width so tiles stay ~square.
// Each board is 5 cols × maxGuesses rows. The grid has 2 columns × gridRows rows.
// For square tiles: tileSize = availableHeight / (gridRows × maxGuesses)
//                   maxWidth = tileSize × 5 × 2 (2 columns of boards)
const containerRef = ref<HTMLElement | null>(null);
const containerHeight = ref(600);

function measure() {
    if (containerRef.value) {
        containerHeight.value = containerRef.value.clientHeight;
    }
}

onMounted(() => {
    measure();
    window.addEventListener('resize', measure);
    onUnmounted(() => window.removeEventListener('resize', measure));
});

const gridStyle = computed(() => {
    const availH = containerHeight.value - 16; // subtract padding
    // For single-row layouts (dordle), cap height to 60% so tiles aren't too tall
    const useH = gridRows.value === 1 ? Math.min(availH, availH * 0.55) : availH;
    const totalRows = gridRows.value * maxGuesses.value;
    const tileSize = useH / totalRows;
    // 2 columns of boards, each 5 tiles wide, plus gaps
    const maxW = tileSize * 5 * 2 + 20; // 20px for gaps + padding
    return {
        maxWidth: `${Math.floor(maxW)}px`,
        maxHeight: `${Math.floor(useH)}px`,
        height: `${Math.floor(useH)}px`,
    };
});

// --- Collect DOM refs from child panels ---

const panelRefs = ref<Record<number, { boardEl: HTMLElement | null } | null>>({});

function setPanelRef(index: number, el: { boardEl: HTMLElement | null } | null) {
    if (el) {
        panelRefs.value[index] = el;
    }
}

function getBoardElForIndex(index: number): HTMLElement | null {
    return panelRefs.value[index]?.boardEl ?? null;
}

defineExpose({ getBoardElForIndex });
</script>
