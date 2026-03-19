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
                :state="game.keyClasses[key] || ''"
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

const diacriticMap = computed(() => langStore.config?.diacritic_map ?? {});
</script>
