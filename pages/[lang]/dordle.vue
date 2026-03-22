<script setup lang="ts">
/**
 * Dordle Mode Page — /<lang>/dordle
 *
 * Two boards, 7 guesses. Same guess goes to both boards.
 * Free play — random words each game, play again anytime.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-dordle`,
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
    modeSlug: 'dordle',
    modeLabel: 'Dordle',
    description: `Play Dordle in ${config.value?.name}. Solve 2 Wordle boards at once with 7 guesses. Free, no account needed.`,
    langStore,
    config: config.value,
});
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, '/dordle');

// Use curated daily-tier words for better quality
const wordList = gameData.value?.daily_words?.length
    ? gameData.value.daily_words
    : (gameData.value?.word_list ?? []);
const { multiBoardRef, startNewGame } = useMultiBoardPage(
    'dordle',
    wordList,
    GAME_MODE_CONFIG.dordle.boardCount
);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="dordle"
        :title="GAME_MODE_CONFIG.dordle.label"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        max-width="2xl"
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
            <h1>Wordle {{ config?.name_native }} — Dordle</h1>
            <p>
                Play Dordle in {{ config?.name }}. Solve 2 Wordle boards at once with 7 guesses.
                Free, no account needed.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
            <p>
                Other modes: <a :href="`/${lang}/unlimited`">Unlimited</a> ·
                <a :href="`/${lang}/speed`">Speed Streak</a> ·
                <a :href="`/${lang}/quordle`">Quordle</a>
            </p>
            <p>
                <a href="https://wordle.global/">Play Wordle in 80+ languages at wordle.global</a>
            </p>
        </div>
    </noscript>
</template>
