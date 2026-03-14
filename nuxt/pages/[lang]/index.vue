<script setup lang="ts">
/**
 * Game Page — /<lang>
 *
 * The core Wordle gameplay page. Fetches language data via SSR,
 * initializes stores, and renders the game board + keyboard.
 */

definePageMeta({ layout: 'game' });

const route = useRoute();
const lang = route.params.lang as string;

// --- Server-side data fetch (SSR) ---
const { data: gameData, error } = await useFetch(`/api/${lang}/data`);

if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

// --- Initialize stores ---
const langStore = useLanguageStore();
const game = useGameStore();
const settings = useSettingsStore();
const stats = useStatsStore();

// Populate language store from API response
langStore.init({
    word_list: gameData.value.word_list,
    word_list_supplement: gameData.value.word_list_supplement,
    characters: gameData.value.characters,
    config: gameData.value.config,
    todays_idx: gameData.value.todays_idx,
    todays_word: gameData.value.todays_word,
    timezone_offset: gameData.value.timezone_offset,
    keyboard: gameData.value.keyboard,
    keyboard_layouts: gameData.value.keyboard_layouts,
    keyboard_layout_name: gameData.value.keyboard_layout_name,
    key_diacritic_hints: gameData.value.key_diacritic_hints,
});

// --- SEO ---
const config = gameData.value.config;
const wordleTitle = `Wordle ${config.name_native || config.name}`;

useSeoMeta({
    title: `${wordleTitle} — ${config.meta?.title || 'Daily Word Puzzle'}`,
    description: config.meta?.description || `Play Wordle in ${config.name}. Guess the daily 5-letter word!`,
    ogTitle: wordleTitle,
    ogDescription: config.meta?.description || `Play Wordle in ${config.name}`,
    ogUrl: `https://wordle.global/${lang}`,
    ogType: 'website',
    ogLocale: config.meta?.locale || lang,
    ogImage: `https://wordle.global/images/share/${lang}_1.png`,
    twitterCard: 'summary_large_image',
});

useHead({
    htmlAttrs: {
        lang: config.meta?.locale?.split('_')[0] || lang,
        dir: langStore.rightToLeft ? 'rtl' : 'ltr',
        translate: 'no',
    },
    meta: [{ name: 'google', content: 'notranslate' }],
    link: [{ rel: 'canonical', href: `https://wordle.global/${lang}` }],
});

// hreflang for all languages
// TODO: fetch all language codes for hreflang
// useHreflang(allLanguageCodes);

// --- Client-side initialization ---
onMounted(() => {
    // Initialize settings from localStorage
    settings.init();

    // Load game results for stats
    stats.loadGameResults(langStore.languageCode);

    // Restore game state from localStorage
    game.loadFromLocalStorage();
    game.showTiles();

    // If game was already over (restored), show stats
    if (game.gameOver) {
        game.showStatsModal = true;
    } else {
        game.maybeShowTutorial();
    }

    // Keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Countdown timer
    const interval = setInterval(() => {
        game.updateTimeUntilNextDay();
    }, 1000);

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        clearInterval(interval);
    });
});

function handleKeyDown(e: KeyboardEvent) {
    // Don't handle if a modal is open and it's not Escape
    if (e.key !== 'Escape' && (game.showHelpModal || game.showStatsModal || game.showOptionsModal)) {
        return;
    }
    game.keyDown(e);
}
</script>

<template>
    <div v-if="gameData" class="min-h-[100dvh] h-[100dvh] overflow-hidden overscroll-none">
        <div class="wrapper container mx-auto flex flex-col h-full w-full max-w-lg safe-area-inset">
            <!-- Header -->
            <GameHeader
                :lang-code="lang"
                @help="game.showHelpModal = true"
                @stats="game.showStatsModal = true"
                @settings="game.showOptionsModal = true"
            />

            <!-- Game Board -->
            <GameBoard />

            <!-- Keyboard -->
            <GameKeyboard
                :keyboard="langStore.keyboard"
                :hints="langStore.keyDiacriticHints"
            />
        </div>

        <!-- Modals -->
        <SharedModalBackdrop
            :visible="game.showHelpModal || game.showStatsModal || game.showOptionsModal"
            @close="game.showHelpModal = false; game.showStatsModal = false; game.showOptionsModal = false"
        />

        <GameHelpModal
            :visible="game.showHelpModal"
            @close="game.showHelpModal = false"
        />

        <GameSettingsModal
            :visible="game.showOptionsModal"
            @close="game.showOptionsModal = false"
        />

        <GameStatsModal
            :visible="game.showStatsModal"
            @close="game.showStatsModal = false"
        />

        <!-- Toast notification -->
        <GameNotificationToast :notification="game.notification" />
    </div>
</template>
