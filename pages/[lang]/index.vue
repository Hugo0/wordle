<script setup lang="ts">
/**
 * Game Page — /<lang>
 *
 * The core Wordle gameplay page. Fetches language data via SSR,
 * initializes stores, and renders the game board + keyboard.
 */

definePageMeta({
    layout: 'game',
    // Force full remount when language changes — prevents game state bleed
    // between languages (Pinia stores are singletons, stale tiles/colors persist)
    key: (route) => route.params.lang as string,
});

const route = useRoute();
const lang = route.params.lang as string;

// --- Language improvement banner (ko, ja) ---
const IMPROVEMENT_LANGS = ['ko', 'ja'];
const showImprovementBanner = ref(false);

function onBannerClick() {
    try {
        useAnalytics().trackLanguageSelect(lang, 'flag');
    } catch {
        // Silently fail
    }
    dismissBanner();
}

function dismissBanner() {
    showImprovementBanner.value = false;
    try {
        localStorage.setItem(`banner_dismissed_${lang}`, '1');
    } catch {
        // localStorage unavailable
    }
}

// --- Server-side data fetch (SSR) ---
const { data: gameData, error } = await useFetch(`/api/${lang}/data`);

if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const { langStore, game, stats, sidebarOpen, toggleSidebar, closeSidebar, gameBoardRef, config } =
    useGamePage(gameData, lang);

// --- SEO ---
const configVal = gameData.value.config;
const { data: allLangs } = await useFetch('/api/languages');
const seo = useGameSeo({
    lang,
    mode: 'classic',
    config: configVal,
    langStore,
    allLangCodes: allLangs.value?.language_codes,
    shareResult: (route.query.r as string) || undefined,
});

// Game header
const headerTitle = computed(() => configVal.name_native || 'Wordle');
const headerSubtitle = computed(() => {
    const idx = gameData.value?.todays_idx;
    return idx != null ? `#${idx}` : '';
});

// --- Client-side initialization ---
onMounted(() => {
    // Show improvement banner for ko/ja if not dismissed
    if (IMPROVEMENT_LANGS.includes(lang)) {
        try {
            if (!localStorage.getItem(`banner_dismissed_${lang}`)) {
                showImprovementBanner.value = true;
            }
        } catch {
            showImprovementBanner.value = true;
        }
    }

    const interval = setInterval(() => {
        game.updateTimeUntilNextDay();
    }, 1000);
    onUnmounted(() => clearInterval(interval));

    // Initialize game from localStorage
    try {
        game.loadFromLocalStorage();
        game.showTiles();

        if (game.gameOver) {
            game.showStatsModal = true;
        } else {
            game.maybeShowTutorial();
        }
    } catch {
        // Failed to restore game state — start fresh
    }
});
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="configVal.name_native || configVal.name || lang"
        current-mode="classic"
        :title="headerTitle"
        :subtitle="headerSubtitle"
        :sidebar-open="sidebarOpen"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
    >
        <!-- Language improvement banner (ko, ja) -->
        <div
            v-if="showImprovementBanner"
            class="relative flex items-center justify-center gap-2 px-3 py-2 text-sm cursor-pointer bg-paper-warm text-muted border-b border-rule transition-colors hover:bg-muted-soft"
            @click="onBannerClick"
        >
            <span
                >This language is being improved &mdash; tap to let us know you're interested!</span
            >
            <button
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted-soft text-muted"
                aria-label="Dismiss"
                @click.stop="dismissBanner"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>

        <!-- The game board -->
        <GameBoard ref="gameBoardRef" />
    </GamePageShell>

    <GameSeoNoscript :lang="lang" mode="classic" :seo="seo" />
</template>
