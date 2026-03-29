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
const langName = config.value?.name || 'your language';
const langNative = config.value?.name_native || langName;
const translatedModeLabel =
    config.value?.meta?.modes?.unlimited?.title?.split('—')?.[0]?.trim() || 'Unlimited';

useGameModeSeo({
    lang,
    modeSlug: 'unlimited',
    modeLabel: translatedModeLabel,
    description: `Play unlimited Wordle in ${langName}. No waiting — get a new word every time. Free, no account needed.`,
    langStore,
    config: config.value,
    faq: [
        {
            question: `What is Wordle Unlimited in ${langName}?`,
            answer: `Wordle Unlimited lets you play as many Wordle games as you want in ${langName}, without waiting for tomorrow's daily puzzle. Each game gives you a new random word to guess in 6 tries.`,
        },
        {
            question: 'Is Wordle Unlimited free?',
            answer: 'Yes, Wordle Unlimited is completely free to play. No account, no download, no ads during gameplay.',
        },
        {
            question: 'Does unlimited mode count toward my daily streak?',
            answer: 'No. Unlimited mode has its own separate statistics. Your daily streak is only affected by the daily puzzle.',
        },
        {
            question: 'How many times can I play?',
            answer: 'There is no limit. You can play as many rounds as you want. After each game, press "Play Again" to get a new word instantly.',
        },
        {
            question: `What languages can I play Wordle Unlimited in?`,
            answer: `Wordle Unlimited is available in over 80 languages at wordle.global, including English, Spanish, German, Finnish, Arabic, French, Italian, Portuguese, and many more.`,
        },
    ],
    howToSteps: [
        {
            name: 'Start a game',
            text: `Visit wordle.global/${lang}/unlimited to start playing Wordle Unlimited in ${langName}. A random 5-letter word is chosen for you.`,
        },
        {
            name: 'Guess the word',
            text: 'Type a valid 5-letter word and press Enter. Green tiles mean the letter is correct and in the right spot. Yellow means the letter is in the word but in the wrong spot. Gray means the letter is not in the word.',
        },
        {
            name: 'Play again instantly',
            text: 'After solving the word (or using all 6 guesses), press "Play Again" to get a new word immediately. No waiting for tomorrow.',
        },
    ],
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
        :title="translatedModeLabel"
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
            <h1>Wordle {{ langNative }} — {{ translatedModeLabel }}</h1>
            <p>
                Play unlimited Wordle in {{ langName }}. No waiting — get a new word every time.
                Free, no account needed.
            </p>

            <h2>How to Play Wordle Unlimited</h2>
            <p>
                Wordle Unlimited works just like the daily Wordle puzzle, but you can play as many
                rounds as you want. Each game gives you a random 5-letter word to guess in 6 tries.
            </p>
            <p>
                After each guess, the tiles change color to show how close you are.
                <strong>Green</strong> means the letter is correct and in the right position.
                <strong>Yellow</strong> means the letter is in the word but in the wrong spot.
                <strong>Gray</strong> means the letter is not in the word at all.
            </p>
            <p>
                When you solve the word or run out of guesses, press "Play Again" to get a new word
                instantly. There is no daily limit — play as many games as you like.
            </p>

            <h2>Frequently Asked Questions</h2>
            <h3>Is Wordle Unlimited free?</h3>
            <p>
                Yes. Wordle Unlimited is completely free. No account required, no download, no ads
                during gameplay.
            </p>
            <h3>Does unlimited mode affect my daily streak?</h3>
            <p>
                No. Unlimited mode has its own separate statistics. Your daily streak is only
                affected by the once-a-day daily puzzle.
            </p>
            <h3>How many times can I play?</h3>
            <p>There is no limit. Play as many rounds as you want, back to back.</p>
            <h3>What languages are available?</h3>
            <p>
                Wordle Unlimited is available in over 80 languages at
                <a href="https://wordle.global/">wordle.global</a>, including English, Spanish,
                German, Finnish, Arabic, French, Italian, Portuguese, and many more.
            </p>

            <h2>More Game Modes</h2>
            <p>
                <a :href="`/${lang}`">Daily Wordle in {{ langName }}</a> — one puzzle per day, track
                your streak.
            </p>
            <p>
                <a :href="`/${lang}/speed`">Speed Streak</a> — solve as many words as you can
                against the clock.
            </p>
            <p>
                <a :href="`/${lang}/dordle`">Dordle</a> — solve 2 boards at once. ·
                <a :href="`/${lang}/tridle`">Tridle</a> — 3 boards. ·
                <a :href="`/${lang}/quordle`">Quordle</a> — 4 boards.
            </p>

            <h2>Play Wordle in Other Languages</h2>
            <p>
                <a href="https://wordle.global/">Play Wordle in 80+ languages at wordle.global</a>
            </p>
        </div>
    </noscript>
</template>
