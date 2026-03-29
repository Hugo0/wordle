<script setup lang="ts">
/**
 * Dynamic multi-board mode page — handles dordle, quordle, octordle,
 * sedecordle, and duotrigordle from a single route.
 *
 * The useFetch calls must stay here (not in a composable) because Nuxt's
 * context-preserving compiler transform only works in <script setup>.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-${route.params.mode}`,
    // Statically inlined — definePageMeta is extracted at build time, can't reference closures
    validate: (route) =>
        ['dordle', 'quordle', 'octordle', 'sedecordle', 'duotrigordle'].includes(
            route.params.mode as string
        ),
});

const route = useRoute();
const lang = route.params.lang as string;
const mode = route.params.mode as GameMode;
const modeDef = GAME_MODE_CONFIG[mode];

const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { data: allLangs } = await useFetch('/api/languages');

const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
    gameData,
    lang
);

const seo = useGameSeo({
    lang,
    mode,
    config: config.value!,
    langStore,
    allLangCodes: allLangs.value?.language_codes,
});

const wordList = gameData.value?.daily_words?.length
    ? gameData.value.daily_words
    : (gameData.value?.word_list ?? []);

const { multiBoardRef, startNewGame } = useMultiBoardPage(mode, wordList, modeDef.boardCount);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        :current-mode="mode"
        :title="seo.modeLabel"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        :max-width="modeDef.shellMaxWidth || 'lg'"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="startNewGame"
    >
        <GameMultiBoardLayout ref="multiBoardRef" />
    </GamePageShell>

    <GameSeoNoscript :lang="lang" :mode="mode" :seo="seo" />
</template>
