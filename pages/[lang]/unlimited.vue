<script setup lang="ts">
/**
 * Unlimited Mode Page — /<lang>/unlimited
 *
 * Same Wordle gameplay but with random words from the daily-tier pool.
 * Play again immediately after finishing — no waiting for tomorrow.
 */
import { createGameConfig } from '~/utils/game-modes';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-unlimited`,
});

const route = useRoute();
const lang = route.params.lang as string;

const { data: gameData, error } = await useFetch(`/api/${lang}/data?minimal=1`, { key: `lang-data-min-${lang}` });
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, gameBoardRef, config } =
    useGamePage(gameData, lang);

// --- SEO ---
const { data: allLangs } = await useFetch('/api/languages', { key: 'languages' });
const seo = useGameSeo({
    lang,
    mode: 'unlimited',
    config: config.value!,
    langStore,
    allLangCodes: allLangs.value?.language_codes,
});

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
    game.resetForMode(createGameConfig('unlimited', lang, { wordLength: 5 }), word);
    game.showStatsModal = false;
    // Track each new round so unlimited rounds are counted individually
    analytics.trackGameRoundStart(lang, 'unlimited');
}

onMounted(() => {
    startNewGame();
});
</script>

<template>
    <div>
        <GamePageShell
            :lang="lang"
            :language-name="config?.name_native || config?.name || lang"
            current-mode="unlimited"
            :title="seo.modeLabel"
            :subtitle="config?.name_native || lang"
            :sidebar-open="sidebarOpen"
            :visible="!!gameData"
            @toggle-sidebar="toggleSidebar"
            @close-sidebar="closeSidebar"
            @new-game="startNewGame"
        >
            <GameBoard ref="gameBoardRef" />
        </GamePageShell>

        <GameSeoNoscript :lang="lang" mode="unlimited" :seo="seo" :config="config!" />
    </div>
</template>
