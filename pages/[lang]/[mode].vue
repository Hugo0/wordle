<script setup lang="ts">
/**
 * Dynamic multi-board mode page — handles dordle, quordle, octordle,
 * sedecordle, and duotrigordle from a single route.
 *
 * The useFetch calls must stay here (not in a composable) because Nuxt's
 * context-preserving compiler transform only works in <script setup>.
 */
import { createGameConfig, GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-${route.params.mode}-${route.query.play || 'daily'}`,
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

// Play type: daily (default) or unlimited via ?play=unlimited
const { playType, isDaily, isUnlimited } = usePlayType(mode);

// Pass mode + play type to API so server returns daily words when needed
const { data: gameData, error } = await useFetch(`/api/${lang}/data`, {
    key: `lang-data-${lang}-${mode}-${playType.value}`,
    query: { mode, play: playType.value },
});
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
    gameData,
    lang
);

// Detect day rollover when tab regains focus
if (isDaily.value) {
    useDayRollover(lang, gameData.value!.todays_idx);
}

// Set the game config with the correct play type
const modeConfig = createGameConfig(mode, lang, {
    playType: playType.value,
    wordLength: 5,
});
game.resetForMode(modeConfig);

const seo = useGameSeo({
    lang,
    mode,
    config: config.value!,
    langStore,
});

const wordList = gameData.value?.daily_words?.length
    ? gameData.value.daily_words
    : (gameData.value?.word_list ?? []);

// Daily multi-board: use deterministic daily words from server.
// Unlimited: random words (existing behavior via useMultiBoardPage).
const dailyWords = isDaily.value ? (gameData.value?.todays_words ?? undefined) : undefined;
const { multiBoardRef, startNewGame } = useMultiBoardPage(
    mode,
    wordList,
    modeDef.boardCount,
    dailyWords
);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        :current-mode="mode"
        :title="seo.modeLabel"
        :subtitle="
            isDaily
                ? `${config?.name_native || lang} · #${gameData?.mode_day_idx ?? gameData?.todays_idx}`
                : `${config?.name_native || lang} · Unlimited`
        "
        :sidebar-open="sidebarOpen"
        :max-width="modeDef.shellMaxWidth || 'lg'"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="startNewGame"
    >
        <GameMultiBoardLayout ref="multiBoardRef" />

        <template #seo>
            <GameSeoNoscript :lang="lang" :mode="mode" :seo="seo" :config="config!" />
        </template>
    </GamePageShell>
</template>
