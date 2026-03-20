<template>
    <main class="flex flex-auto justify-center items-center overflow-hidden">
        <!-- All multi-board modes use the same grid layout -->
        <div class="w-full h-full max-h-[600px] p-2" :class="gridClass">
            <GameMultiBoardPanel
                v-for="i in boardCount"
                :key="i - 1"
                :ref="(el: any) => setPanelRef(i - 1, el)"
                :board-index="i - 1"
            />
            <!-- Tridle: empty 4th cell keeps grid symmetric, board 3 in bottom-left -->
            <div v-if="boardCount === 3" aria-hidden="true" />
        </div>
    </main>
</template>

<script setup lang="ts">
const game = useGameStore();

const boardCount = computed(() => game.gameConfig.boardCount);

const gridClass = computed(() => {
    switch (boardCount.value) {
        case 2:
            return 'grid grid-cols-2 gap-1';
        case 3:
            return 'grid grid-cols-2 grid-rows-2 gap-1'; // 2 top + 1 bottom centered
        case 4:
            return 'grid grid-cols-2 grid-rows-2 gap-1';
        default:
            return 'grid grid-cols-2 gap-1';
    }
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
