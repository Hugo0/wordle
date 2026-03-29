<template>
    <div
        role="group"
        aria-label="Keyboard"
        class="flex flex-col container mx-auto gap-2 w-full max-w-lg pb-2 md:pb-5 px-2"
    >
        <div v-for="(row, i) in keyboard" :key="i" class="flex gap-1">
            <GameKeyboardKey
                v-for="key in row"
                :key="key"
                :char="key"
                :state="keyState[key] || ''"
                :board-states="boardStatesMap?.[key]"
                :hint="hints[key.toLowerCase()]?.text"
                :hint-above="hints[key.toLowerCase()]?.above"
                :variants="diacriticMap[key.toLowerCase()]"
                @press="game.keyClick"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
const game = useGameStore();
const langStore = useLanguageStore();

defineProps<{
    keyboard: string[][];
    hints: Record<string, { text: string; above?: boolean }>;
}>();

const keyState = computed(() => {
    if (game.isMultiBoard) return game.mergedKeyStates;
    return game.keyClasses;
});

/**
 * Pre-build per-key board states map ONCE per reactive change.
 * Previously this was a plain function called per-key (30× per render),
 * each creating a new array by mapping all 32 boards = 960 allocations.
 * Now it's a single computed that builds the full map once.
 */
const boardStatesMap = computed<Record<string, string[]> | undefined>(() => {
    if (!game.isMultiBoard) return undefined;
    const map: Record<string, string[]> = {};
    const boardsList = game.boards;
    // Collect all unique keys from the first board's keyStates
    const firstBoard = boardsList[0];
    if (!firstBoard) return undefined;
    for (const key of Object.keys(firstBoard.keyStates)) {
        map[key] = boardsList.map((b) => b.keyStates[key] || '');
    }
    return map;
});

const diacriticMap = computed(() => langStore.config?.diacritic_map ?? {});
</script>
