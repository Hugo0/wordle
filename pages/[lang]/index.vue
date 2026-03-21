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
const wordleNative = configVal.meta?.wordle_native || '';
const metaTitle = (configVal.meta?.title || 'The daily word game').trim();
const wordleBase = `Wordle ${configVal.name_native}`;
const wordleShort = wordleNative ? `${wordleBase} (${wordleNative})` : wordleBase;
const isUntranslatedTitle = metaTitle === 'The daily word game' && configVal.language_code !== 'en';

let seoTitle = isUntranslatedTitle
    ? `${wordleBase} — Play in ${configVal.name}`
    : `${wordleShort} — ${metaTitle}`;
if (seoTitle.length > 60) seoTitle = wordleShort;

const nativeDesc = (
    configVal.meta?.description ||
    'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!'
).trim();
const isUntranslatedDesc =
    nativeDesc ===
        'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!' &&
    configVal.language_code !== 'en';
let seoDescription = isUntranslatedDesc
    ? `Play Wordle in ${configVal.name} (${configVal.name_native}) — ${nativeDesc}`
    : `${nativeDesc} | Wordle ${configVal.name}`;
if (seoDescription.length > 160) seoDescription = nativeDesc.substring(0, 155) + '...';

// Share result param (?r=1-6 or ?r=x) — used for social preview when sharing
const shareResult = route.query.r as string | undefined;
const validResults = ['1', '2', '3', '4', '5', '6', 'x'];
const isShareLink = shareResult !== undefined && validResults.includes(shareResult);

// Override title/description for share links
const configText = gameData.value.config.text || {};
let challengeText = '';
if (isShareLink) {
    if (shareResult === 'x') {
        seoTitle = `${wordleBase} — X/6`;
        seoDescription = configText.share_challenge_lose || "I didn't get today's Wordle. Can you?";
    } else {
        seoTitle = `${wordleBase} — ${shareResult}/6`;
        const challengeWin =
            configText.share_challenge_win || "I got today's Wordle in {n}. Can you beat me?";
        seoDescription = challengeWin.replace('{n}', shareResult!);
    }
    challengeText = seoDescription;
}

useSeoMeta({
    title: seoTitle,
    description: seoDescription,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    ogUrl: `https://wordle.global/${lang}`,
    ogType: 'website',
    ogLocale: configVal.meta?.locale || lang,
    twitterCard: 'summary_large_image',
    twitterTitle: seoTitle,
    twitterDescription: seoDescription,
});

// OG image — static files generated at build time
const shareImageUrl = isShareLink
    ? `https://wordle.global/images/share/${lang}_${shareResult}.png`
    : 'https://wordle.global/images/og-image.png';

useSeoMeta({
    ogImage: shareImageUrl,
    ogImageWidth: 1200,
    ogImageHeight: 630,
});

useHead({
    htmlAttrs: {
        lang: configVal.meta?.locale?.split('_')[0] || lang,
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

        <template #overlays>
            <!-- PWA install banner (shown after game win) -->
            <div
                id="pwa-install-banner"
                class="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-correct text-white shadow-lg"
                style="display: none"
            >
                <div class="flex-1 min-w-0">
                    <strong>{{ langStore.config?.ui?.add_to_home || 'Add to Home Screen' }}</strong>
                    <div class="text-sm opacity-90">
                        {{
                            langStore.config?.ui?.play_daily_like_app ||
                            'Play Wordle daily like an app'
                        }}
                    </div>
                </div>
                <button
                    class="shrink-0 px-4 py-1.5 bg-paper text-correct font-semibold text-sm hover:opacity-90"
                    @click="$pwaInstall?.install()"
                >
                    {{ langStore.config?.ui?.install || 'Install' }}
                </button>
                <button
                    class="shrink-0 p-1 opacity-70 hover:opacity-100"
                    aria-label="Dismiss"
                    @click="$pwaInstall?.dismiss()"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <!-- PWA install component (cross-platform install dialog) -->
            <ClientOnly>
                <pwa-install
                    manifest-url="/manifest.json"
                    name="Wordle Global"
                    description="Play Wordle in 80+ languages"
                    install-description="Install for quick daily access"
                    manual-apple
                    manual-chrome
                />
            </ClientOnly>
        </template>
    </GamePageShell>

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
                Wordle {{ configVal.name_native }} —
                {{ configVal.meta?.title || 'The daily word game' }}
            </h1>
            <h2>{{ configVal.help?.title }}</h2>
            <p>
                {{ configVal.help?.text_1_1_1 }} <strong>Wordle</strong>
                {{ configVal.help?.text_1_1_2 }}
            </p>
            <p>{{ configVal.help?.text_1_2 }}</p>
            <p>{{ configVal.help?.text_1_3 }}</p>
            <p>{{ configVal.help?.text_3 }}</p>
            <p>
                <a href="https://wordle.global/">Play Wordle in 80+ languages at wordle.global</a>
            </p>
            <p>
                Game modes:
                <a :href="`/${lang}/unlimited`">Unlimited</a> ·
                <a :href="`/${lang}/speed`">Speed Streak</a> ·
                <a :href="`/${lang}/dordle`">Dordle</a> ·
                <a :href="`/${lang}/quordle`">Quordle</a>
            </p>
        </div>
    </noscript>
</template>
