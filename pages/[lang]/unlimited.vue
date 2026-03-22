<script setup lang="ts">
/**
 * Unlimited Mode Page — /<lang>/unlimited
 *
 * Same Wordle gameplay but with random words from the daily-tier pool.
 * Play again immediately after finishing — no waiting for tomorrow.
 */
import { createGameConfig } from '~/utils/game-modes';
import { createBoardState } from '~/utils/types';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-unlimited`,
});

const route = useRoute();
const lang = route.params.lang as string;

const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, gameBoardRef, config } =
    useGamePage(gameData, lang);

// --- SEO ---
useGameModeSeo({
    lang,
    modeSlug: 'unlimited',
    modeLabel: 'Unlimited',
    description: `Play unlimited Wordle in ${config.value?.name}. No waiting — get a new word every time. Free, no account needed.`,
    langStore,
    config: config.value,
});
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, '/unlimited');

// --- Random word selection ---
function pickRandomWord(): string {
    // Use curated daily-tier words for better quality (not the full valid list)
    const pool = gameData.value!.daily_words?.length
        ? gameData.value!.daily_words
        : gameData.value!.word_list;
    return pool[Math.floor(Math.random() * pool.length)]!;
}

const analytics = useAnalytics();

function startNewGame() {
    const word = pickRandomWord();
    const cfg = createGameConfig('unlimited', lang, { wordLength: 5 });
    game.gameConfig = cfg;
    game.boards = [createBoardState(0, word, cfg.maxGuesses, cfg.wordLength)];
    game.activeBoardIndex = 0;
    game.gameOver = false;
    game.gameWon = false;
    game.initKeyClasses();
    game.showTiles();
    game.showStatsModal = false;
    // Track each new round so unlimited rounds are counted individually
    analytics.trackGameRoundStart(lang, 'unlimited');
}

onMounted(() => {
    startNewGame();
});
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="unlimited"
        title="Unlimited"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="startNewGame"
    >
        <GameBoard ref="gameBoardRef" />
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
            <h1>Wordle {{ config?.name_native }} — Unlimited</h1>
            <p>
                Play unlimited Wordle in {{ config?.name }}. No waiting — get a new word every time.
                Free, no account needed.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
            <p>
                Other modes: <a :href="`/${lang}/speed`">Speed Streak</a> ·
                <a :href="`/${lang}/dordle`">Dordle</a> ·
                <a :href="`/${lang}/quordle`">Quordle</a>
            </p>
            <p>
                <a href="https://wordle.global/">Play Wordle in 80+ languages at wordle.global</a>
            </p>
        </div>
    </noscript>
</template>
