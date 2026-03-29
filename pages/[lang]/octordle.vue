<script setup lang="ts">
/**
 * Octordle Mode Page — /<lang>/octordle
 *
 * Eight boards, 13 guesses. Same guess goes to all boards.
 * Free play — random words each game, play again anytime.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-octordle`,
});

const route = useRoute();
const lang = route.params.lang as string;

const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
    gameData,
    lang
);

useGameModeSeo({
    lang,
    modeSlug: 'octordle',
    modeLabel: 'Octordle',
    description: `Play Octordle in ${config.value?.name}. Solve 8 Wordle boards at once with 13 guesses. Free, no account needed.`,
    langStore,
    config: config.value,
});
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, '/octordle');

const wordList = gameData.value?.daily_words?.length
    ? gameData.value.daily_words
    : (gameData.value?.word_list ?? []);
const { multiBoardRef, startNewGame } = useMultiBoardPage(
    'octordle',
    wordList,
    GAME_MODE_CONFIG.octordle.boardCount
);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="octordle"
        :title="GAME_MODE_CONFIG.octordle.label"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        max-width="full"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="startNewGame"
    >
        <GameMultiBoardLayout ref="multiBoardRef" />
    </GamePageShell>

    <noscript data-allow-mismatch>
        <div
            style="
                max-width: 600px;
                margin: 40px auto;
                padding: 20px;
                font-family: system-ui, sans-serif;
                color: #333;
            "
        >
            <h1>Wordle {{ config?.name_native }} — Octordle</h1>
            <p>
                Play Octordle in {{ config?.name }}. Solve 8 Wordle boards at once with 13 guesses.
                Free, no account needed.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
        </div>
    </noscript>
</template>
