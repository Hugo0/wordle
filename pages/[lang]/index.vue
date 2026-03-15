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

// --- Language improvement banner (ko, ja) ---
const IMPROVEMENT_LANGS = ['ko', 'ja'];
const showImprovementBanner = ref(false);

function onBannerClick() {
    try {
        import('posthog-js').then((mod) =>
            mod.default.capture('language_interest', { language: lang })
        );
    } catch {
        // Silently fail
    }
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

// --- Initialize stores ---
const langStore = useLanguageStore();
const game = useGameStore();
const settings = useSettingsStore();
const stats = useStatsStore();

// Populate language store from API response
langStore.init({
    word_list: gameData.value.word_list,
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
const wordleNative = config.meta?.wordle_native || '';
const metaTitle = (config.meta?.title || 'The daily word game').trim();
const wordleBase = `Wordle ${config.name_native}`;
const wordleShort = wordleNative ? `${wordleBase} (${wordleNative})` : wordleBase;
const isUntranslatedTitle = metaTitle === 'The daily word game' && config.language_code !== 'en';

let seoTitle = isUntranslatedTitle
    ? `${wordleBase} — Play in ${config.name}`
    : `${wordleShort} — ${metaTitle}`;
if (seoTitle.length > 60) seoTitle = wordleShort;

const nativeDesc = (
    config.meta?.description ||
    'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!'
).trim();
const isUntranslatedDesc =
    nativeDesc ===
        'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!' &&
    config.language_code !== 'en';
let seoDescription = isUntranslatedDesc
    ? `Play Wordle in ${config.name} (${config.name_native}) — ${nativeDesc}`
    : `${nativeDesc} | Wordle ${config.name}`;
if (seoDescription.length > 160) seoDescription = nativeDesc.substring(0, 155) + '...';

useSeoMeta({
    title: seoTitle,
    description: seoDescription,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogUrl: `https://wordle.global/${lang}`,
    ogType: 'website',
    ogLocale: config.meta?.locale || lang,
    ogImage: `https://wordle.global/static/images/share/${lang}_1.png`,
    twitterCard: 'summary_large_image',
    twitterTitle: seoTitle,
    twitterDescription: seoDescription,
});

useHead({
    htmlAttrs: {
        lang: config.meta?.locale?.split('_')[0] || lang,
        dir: langStore.rightToLeft ? 'rtl' : 'ltr',
        translate: 'no',
    },
    meta: [{ name: 'google', content: 'notranslate' }],
    link: [{ rel: 'canonical', href: `https://wordle.global/${lang}` }],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: wordleBase,
                url: `https://wordle.global/${lang}`,
                description: seoDescription,
                applicationCategory: 'GameApplication',
                operatingSystem: 'Any',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                inLanguage: [lang],
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Wordle Global',
                        item: 'https://wordle.global/',
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: wordleBase,
                        item: `https://wordle.global/${lang}`,
                    },
                ],
            }),
        },
    ],
});

// Fetch all language codes for hreflang
const { data: allLangs } = await useFetch('/api/languages');
if (allLangs.value?.language_codes) {
    useHreflang(allLangs.value.language_codes);
}

// Template refs for animation DOM access (avoids document.querySelector in store)
const gameBoardRef = ref<{ boardEl: HTMLElement | null } | null>(null);
const gameKeyboardRef = ref<{ $el: HTMLElement } | null>(null);

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

    // Pass DOM refs to game store for animations
    game.setBoardEl(() => gameBoardRef.value?.boardEl ?? null);
    game.setKeyboardEl(() => gameKeyboardRef.value?.$el ?? null);

    // Keyboard event listener — MUST be first, before anything that might throw
    window.addEventListener('keydown', handleKeyDown);

    const interval = setInterval(() => {
        game.updateTimeUntilNextDay();
    }, 1000);

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        clearInterval(interval);
    });

    // Initialize stores from localStorage (may fail in private browsing)
    try {
        settings.init();
        stats.loadGameResults(langStore.languageCode);
        game.loadFromLocalStorage();
        game.showTiles();

        if (game.gameOver) {
            game.showStatsModal = true;
        } else {
            game.maybeShowTutorial();
        }

        // Analytics initialization
        const analytics = useAnalytics();
        analytics.trackPageView(langStore.languageCode);
        analytics.trackGameStart({
            language: langStore.languageCode,
            is_returning: stats.stats.n_games > 0,
            current_streak: stats.stats.current_streak,
        });
        analytics.trackPWASession(langStore.languageCode);
        analytics.initAbandonTracking(() => ({
            language: langStore.languageCode,
            activeRow: game.activeRow,
            gameOver: game.gameOver,
            lastGuessValid: true,
        }));
        analytics.initErrorTracking(langStore.languageCode);
        analytics.identifyUser(langStore.languageCode);
    } catch (err) {
        console.warn('[wordle] Failed to restore game state:', err);
    }
});

function handleKeyDown(e: KeyboardEvent) {
    // Don't handle if a modal is open and it's not Escape
    if (
        e.key !== 'Escape' &&
        (game.showHelpModal || game.showStatsModal || game.showOptionsModal)
    ) {
        return;
    }
    game.keyDown(e);
}
</script>

<template>
    <div v-if="gameData" class="min-h-[100dvh] h-[100dvh]">
        <div class="wrapper container mx-auto flex flex-col h-full w-full max-w-lg safe-area-inset">
            <!-- The Header -->
            <GameHeader
                :lang-code="lang"
                @help="game.showHelpModal = !game.showHelpModal"
                @stats="game.showStatsModal = !game.showStatsModal"
                @settings="game.showOptionsModal = !game.showOptionsModal"
            />

            <!-- Language improvement banner (ko, ja) -->
            <div
                v-if="showImprovementBanner"
                class="relative flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium cursor-pointer bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border-b border-amber-200 dark:border-amber-700"
                @click="onBannerClick"
            >
                <span
                    >This language is being improved &mdash; tap here to let us know you're
                    interested!</span
                >
                <button
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-400"
                    aria-label="Dismiss"
                    @click.stop="dismissBanner"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
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

            <!-- The keyboard -->
            <GameKeyboard
                ref="gameKeyboardRef"
                :keyboard="langStore.keyboard"
                :hints="langStore.keyDiacriticHints"
            />
        </div>

        <!-- NOTIFICATIONS & MODALS -->
        <div
            class="container mx-auto flex w-full max-w-lg justify-center items-center overflow z-1"
        >
            <SharedModalBackdrop
                :visible="game.showHelpModal || game.showStatsModal || game.showOptionsModal"
                @close="
                    game.showHelpModal = false;
                    game.showStatsModal = false;
                    game.showOptionsModal = false;
                "
            />

            <!-- help modal -->
            <GameHelpModal :visible="game.showHelpModal" @close="game.showHelpModal = false" />

            <!-- options modal -->
            <GameSettingsModal
                :visible="game.showOptionsModal"
                @close="game.showOptionsModal = false"
            />
        </div>

        <!-- stats modal -->
        <GameStatsModal :visible="game.showStatsModal" @close="game.showStatsModal = false" />

        <!-- Toast notification -->
        <GameNotificationToast :notification="game.notification" />
    </div>

    <!-- SEO content — visible only when JS is disabled (crawlers, noscript browsers).
         data-allow-mismatch suppresses Vue hydration warning since noscript
         content is parsed differently by browser vs SSR. -->
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
            <h1>
                Wordle {{ config.name_native }} — {{ config.meta?.title || 'The daily word game' }}
            </h1>
            <h2>{{ config.help?.title }}</h2>
            <p>
                {{ config.help?.text_1_1_1 }} <strong>Wordle</strong> {{ config.help?.text_1_1_2 }}
            </p>
            <p>{{ config.help?.text_1_2 }}</p>
            <p>{{ config.help?.text_1_3 }}</p>
            <p>{{ config.help?.text_3 }}</p>
            <p>
                <a href="https://wordle.global/">Play Wordle in 65+ languages at wordle.global</a>
            </p>
        </div>
    </noscript>
</template>
