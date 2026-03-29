<script setup lang="ts">
/**
 * Sedecordle Mode Page — /<lang>/sedecordle
 *
 * Sixteen boards, 21 guesses. Same guess goes to all boards.
 * Free play — random words each game, play again anytime.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-sedecordle`,
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
    modeSlug: 'sedecordle',
    modeLabel: 'Sedecordle',
    description: `Play Sedecordle in ${config.value?.name}. Solve 16 Wordle boards at once with 21 guesses. Free, no account needed.`,
    langStore,
    config: config.value,
});
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, '/sedecordle');

const wordList = gameData.value?.daily_words?.length
    ? gameData.value.daily_words
    : (gameData.value?.word_list ?? []);
const { multiBoardRef, startNewGame } = useMultiBoardPage(
    'sedecordle',
    wordList,
    GAME_MODE_CONFIG.sedecordle.boardCount
);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="sedecordle"
        :title="GAME_MODE_CONFIG.sedecordle.label"
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
            <h1>Wordle {{ config?.name_native }} — Sedecordle</h1>
            <p>
                Play Sedecordle in {{ config?.name }}. Solve 16 Wordle boards at once with 21
                guesses. Free, no account needed.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
        </div>
    </noscript>
</template>
