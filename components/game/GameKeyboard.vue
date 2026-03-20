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
                :board-states="boardKeyStates(key)"
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

/** For multi-board: return per-board states for a key (for split-color rendering) */
function boardKeyStates(key: string): string[] | undefined {
    if (!game.isMultiBoard) return undefined;
    return game.boards.map((board) => board.keyStates[key] || '');
}

const diacriticMap = computed(() => langStore.config?.diacritic_map ?? {});
</script>
