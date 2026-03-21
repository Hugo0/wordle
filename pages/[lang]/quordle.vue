<script setup lang="ts">
/**
 * Quordle Mode Page — /<lang>/quordle
 *
 * Four boards, 9 guesses. Same guess goes to all boards.
 * Free play — random words each game, play again anytime.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-quordle`,
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
    modeSlug: 'quordle',
    modeLabel: 'Quordle',
    description: `Play Quordle in ${config.value?.name}. Solve 4 Wordle boards at once with 9 guesses. Free, no account needed.`,
    langStore,
    config: config.value,
});
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, '/quordle');

const wordList = gameData.value?.word_list ?? [];
const { multiBoardRef, startNewGame } = useMultiBoardPage(
    'quordle',
    wordList,
    GAME_MODE_CONFIG.quordle.boardCount
);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="quordle"
        :title="GAME_MODE_CONFIG.quordle.label"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        max-width="2xl"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
    >
        <GameMultiBoardLayout ref="multiBoardRef" />

        <template #post-keyboard>
            <div v-if="game.gameOver && !game.showStatsModal" class="flex justify-center py-3">
                <button
                    class="px-6 py-2.5 bg-correct hover:opacity-90 text-white font-semibold text-sm transition-opacity"
                    @click="startNewGame"
                >
                    Play Again
                </button>
            </div>
        </template>
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
            <h1>Wordle {{ config?.name_native }} — Quordle</h1>
            <p>
                Play Quordle in {{ config?.name }}. Solve 4 Wordle boards at once with 9 guesses.
                Free, no account needed.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
            <p>
                Other modes: <a :href="`/${lang}/unlimited`">Unlimited</a> ·
                <a :href="`/${lang}/speed`">Speed Streak</a> ·
                <a :href="`/${lang}/dordle`">Dordle</a>
            </p>
            <p>
                <a href="https://wordle.global/">Play Wordle in 80+ languages at wordle.global</a>
            </p>
        </div>
    </noscript>
</template>
