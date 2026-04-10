<script setup lang="ts">
/**
 * Homepage — /
 *
 * Language picker with search, showing all available languages.
 * Matches the legacy Flask index.html exactly.
 */
import { useSettingsStore } from '~/stores/settings';
import { readJson, writeJson, readLocal, writeLocal } from '~/utils/storage';
import { Flame, Check, Compass, Square, Zap, Columns2, User, CircleCheck } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import {
    GAME_MODES_UI,
    getModeRoute,
    getModeLabel,
    getModeDescription,
} from '~/composables/useGameModes';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import { buildDailyResultMap, toLocalDay, stepBack } from '~/utils/streak-dates';
import type { GameResult } from '~/utils/types';

const settings = useSettingsStore();
const { loggedIn: authLoggedIn, user: authUser, avatarUrl: authAvatarUrl } = useAuth();
const { openLoginModal } = useLoginModal();

// PWA install — inject from pwa.client.ts plugin
const pwaInstall = import.meta.client ? inject<{ install: () => void; status: () => { isStandalone: boolean; dismissed: boolean; hasPrompt: boolean; isIOS: boolean } }>('pwaInstall') : undefined;
const showPwaInstall = ref(false);


// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const { data: langData } = await useFetch('/api/languages', { key: 'languages' });
const { data: otherWordles } = await useFetch('/api/other-wordles');

// Homepage config — SSR uses Accept-Language detection; client may override via ?lang=
const hpLangOverride = ref<string | undefined>(undefined);
const { data: homepageConfig } = await useFetch('/api/homepage-config', {
    query: { lang: hpLangOverride },
});
const hpUi = computed(() => homepageConfig.value?.ui);
const hpLang = computed(() => (homepageConfig.value as { lang?: string } | null)?.lang || 'en');

// Resolved homepage strings — config always has defaults from data-loader merge
const hp = computed(() => {
    const ui = hpUi.value;
    return {
        tagline: ui?.homepage_tagline ?? "The world's word game",
        playingIn: ui?.homepage_playing_in ?? 'Playing in',
        change: ui?.homepage_change ?? 'change',
        chooseLanguage: ui?.homepage_choose_language ?? 'Choose your language',
        languagesCounting:
            ui?.homepage_languages_counting ?? 'languages and counting — more added regularly.',
        search: ui?.homepage_search ?? 'Search languages...',
        languages: ui?.languages ?? 'languages',
    };
});

const langCount = computed(() => langData.value?.language_codes?.length || 65);
const languagePopularity = computed(() => langData.value?.language_popularity || []);
const languages = computed(
    () =>
        (langData.value?.languages as Record<
            string,
            {
                language_name: string;
                language_name_native: string;
                language_code: string;
            }
        >) || {}
);
const languageCodes = computed(() => (langData.value?.language_codes as string[]) || []);

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

const title = computed(
    () => `Wordle Global \u2014 Play the Free Daily Word Game in ${langCount.value}+ Languages`
);
const description = computed(
    () =>
        `Play Wordle in ${langCount.value}+ languages, from Arabic to Yoruba \u2014 the largest multilingual Wordle. Word definitions, no ads, no login. Daily puzzle plus 9 game modes.`
);

useSeoMeta({
    title: title.value,
    description: description.value,
    ogTitle: title.value,
    ogUrl: 'https://wordle.global/',
    ogType: 'website',
    ogDescription: description.value,
    ogLocale: 'en',
    twitterCard: 'summary_large_image',
    twitterTitle: title.value,
    twitterDescription: description.value,
});

// Restore og:image (static file generated at build time)
useSeoMeta({
    ogImage: 'https://wordle.global/images/og-image.png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
});

useHead({
    htmlAttrs: { lang: 'en' },
    link: [
        { rel: 'canonical', href: 'https://wordle.global/' },
        {
            rel: 'sitemap',
            type: 'application/xml',
            title: 'Sitemap',
            href: '/sitemap.xml',
        },
    ],
    meta: [
        { name: 'msvalidate.01', content: '609E2DD36EFFA9A3C673F46020FDF0D3' },
        { property: 'twitter:domain', content: 'wordle.global' },
        { property: 'twitter:url', content: 'https://wordle.global/' },
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Wordle Global',
                url: 'https://wordle.global',
                description: description.value,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://wordle.global/?q={search_term_string}',
                    'query-input': 'required name=search_term_string',
                },
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'Wordle Global',
                url: 'https://wordle.global',
                description: description.value,
                applicationCategory: 'GameApplication',
                operatingSystem: 'Any',
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                },
                inLanguage: languageCodes.value,
                browserRequirements: 'Requires JavaScript',
                isPartOf: {
                    '@type': 'WebSite',
                    name: 'Wordle Global',
                    url: 'https://wordle.global',
                },
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: 'Wordle Languages',
                numberOfItems: langCount.value,
                itemListElement: [...languageCodes.value].sort().map((lc: string, i: number) => ({
                    '@type': 'ListItem',
                    position: i + 1,
                    url: `https://wordle.global/${lc}`,
                    name: `Wordle ${languages.value[lc]?.language_name_native || lc}`,
                })),
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Wordle Global',
                url: 'https://wordle.global',
                logo: 'https://wordle.global/images/og-image.png',
                sameAs: ['https://github.com/Hugo0/wordle'],
            }),
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: (homepageConfig.value?.seo?.faq || []).map(
                    (item: { q: string; a: string }) => ({
                        '@type': 'Question',
                        name: item.q
                            .replace(/\{langName\}/g, homepageConfig.value?.name || 'English')
                            .replace(/\{lang\}/g, hpLang.value),
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: item.a
                                .replace(/\{langName\}/g, homepageConfig.value?.name || 'English')
                                .replace(/\{lang\}/g, hpLang.value),
                        },
                    })
                ),
            }),
        },
    ],
});

// ---------------------------------------------------------------------------
// Client-side state
// ---------------------------------------------------------------------------

const searchText = ref('');
const showAboutModal = ref(false);

// Game mode picker
const showModePicker = ref(false);
const selectedLangCode = ref('');
const selectedLangName = ref('');

// Game results from localStorage
const gameResults = ref<
    Record<string, Array<{ won: boolean; attempts: number | string; date: string }>>
>({});
// Initialize with SSR-detected language (from Accept-Language header)
const detectedLanguageCode = ref<string | null>(hpLang.value !== 'en' ? hpLang.value : null);

const analytics = useAnalytics();

// ---------------------------------------------------------------------------
// Tier detection & personalization
// ---------------------------------------------------------------------------

const isReturningUser = computed(() => Object.keys(gameResults.value).length > 0);

/** Product-wide streak: any daily mode in any language. */
const productStreak = computed(() => {
    if (!isReturningUser.value) return 0;
    const dayMap = buildDailyResultMap(gameResults.value as Record<string, GameResult[]>);
    if (dayMap.size === 0) return 0;
    const today = toLocalDay(new Date());
    let streak = 0;
    let day = today;
    while (dayMap.get(day) === 'won') {
        streak++;
        day = stepBack(day);
    }
    if (streak === 0 && dayMap.get(stepBack(today)) === 'won') {
        day = stepBack(today);
        while (dayMap.get(day) === 'won') {
            streak++;
            day = stepBack(day);
        }
    }
    return streak;
});


/** Mode icon mapping for continue-playing cards */
const MODE_CARD_ICONS: Record<string, any> = {
    classic: Square,
    speed: Zap,
    dordle: Columns2,
    semantic: Compass,
};

/** Continue Playing cards — top 3 most recently played mode+language combos. */
const continuePlayingCards = computed(() => {
    if (!isReturningUser.value) return [];

    const cards: Array<{
        key: string;
        href: string;
        flagSrc: string | null;
        langName: string;
        title: string;
        subtitle: string;
        streak: number;
        cta: string;
        borderColor: string;
        modeIcon: any;
        dailySolved: boolean;
    }> = [];

    const entries: Array<{ code: string; mode: string; lastDate: string; results: any[] }> = [];

    for (const [key, results] of Object.entries(gameResults.value)) {
        if (!results || results.length === 0) continue;
        const lastResult = results[results.length - 1]!;

        let code: string;
        let mode: string;
        if (!key.includes('_')) {
            code = key;
            mode = 'classic';
        } else if (key.endsWith('_unlimited') || (!key.endsWith('_daily') && key.includes('_') && !key.match(/^[a-z]{2,3}_[a-z]+_daily$/))) {
            continue; // Skip unlimited entries
        } else if (key.endsWith('_daily')) {
            const parts = key.replace(/_daily$/, '').split('_');
            code = parts[0]!;
            mode = parts.slice(1).join('_');
        } else {
            continue;
        }

        if (!languages.value[code]) continue;
        entries.push({ code, mode, lastDate: lastResult.date, results });
    }

    entries.sort((a, b) => (b.lastDate > a.lastDate ? 1 : -1));

    for (const entry of entries.slice(0, 3)) {
        const lang = languages.value[entry.code];
        if (!lang) continue;

        const modeDef = GAME_MODE_CONFIG[entry.mode as keyof typeof GAME_MODE_CONFIG];
        if (!modeDef) continue;

        const modeUI = GAME_MODES_UI.find((m) => m.id === entry.mode);
        const lastResult = entry.results[entry.results.length - 1]!;
        const isSolved = lastResult.won;
        const route = modeUI ? getModeRoute(modeUI, entry.code) : `/${entry.code}`;
        const langStreak = getCurrentStreak(entry.code);

        cards.push({
            key: `${entry.code}_${entry.mode}`,
            href: isSolved
                ? `${route}${route?.includes('?') ? '&' : '?'}play=unlimited`
                : route || `/${entry.code}`,
            flagSrc: showFlag(entry.code) ? getFlag(entry.code) : null,
            langName: lang.language_name_native,
            title: lang.language_name_native,
            subtitle: modeDef.label,
            streak: langStreak,
            cta: isSolved ? 'Unlimited →' : 'Play →',
            borderColor: isSolved ? 'var(--color-correct, #2d8544)' : 'var(--color-rule, #d4cfc7)',
            modeIcon: MODE_CARD_ICONS[entry.mode] || Square,
            dailySolved: isSolved,
        });
    }

    return cards;
});

const showBoardPicker = ref(false);

onMounted(() => {
    settings.init();

    // Analytics: track homepage view
    analytics.trackHomepageView();

    // Load game results
    const stored = readJson<Record<string, Array<{ won: boolean; attempts: number | string; date: string }>>>('game_results');
    if (stored) gameResults.value = stored;

    // Cache languages for game page
    writeJson('languages_cache', languages.value);

    // Detect language priority: 1) explicit user pick, 2) most recently played, 3) browser
    const savedLangPref = readLocal('preferred_language');
    const clientLang = savedLangPref || getMostRecentLanguage() || detectBrowserLanguage();
    if (clientLang && clientLang !== detectedLanguageCode.value) {
        detectedLanguageCode.value = clientLang;
        // Re-fetch homepage config for the user's actual preferred language
        if (clientLang !== hpLang.value) {
            hpLangOverride.value = clientLang;
        }
    } else if (!detectedLanguageCode.value) {
        detectedLanguageCode.value = clientLang;
    }

    // PWA install detection
    if (pwaInstall) {
        const s = pwaInstall.status();
        showPwaInstall.value = !s.isStandalone && !s.dismissed && (s.hasPrompt || s.isIOS);
    }

    // Escape key closes modals
    window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
    if (import.meta.client) {
        window.removeEventListener('keydown', onKeyDown);
    }
});

function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
        showAboutModal.value = false;
    }
}

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/**
 * Check localStorage game_results for the most recently played language.
 * Returns the language code with the most recent game, or null.
 */
function getMostRecentLanguage(): string | null {
    if (!gameResults.value || Object.keys(gameResults.value).length === 0) return null;
    let bestCode: string | null = null;
    let bestDate = '';
    for (const [code, results] of Object.entries(gameResults.value)) {
        if (!results.length || !languages.value[code]) continue;
        const lastDate = results[results.length - 1]!.date;
        if (lastDate > bestDate) {
            bestDate = lastDate;
            bestCode = code;
        }
    }
    return bestCode;
}

function detectBrowserLanguage(): string | null {
    try {
        const candidates =
            navigator.languages?.length > 0 ? navigator.languages : [navigator.language || ''];
        for (const browserLang of candidates) {
            const lower = browserLang.toLowerCase();
            if (languages.value[lower]) return lower;
            const prefix = lower.split('-')[0] ?? '';
            if (prefix && languages.value[prefix]) return prefix;
            if (prefix === 'no' && languages.value['nb']) return 'nb';
        }
    } catch {
        // navigator.languages unavailable
    }
    return null;
}

// ---------------------------------------------------------------------------
// Sorting and filtering
// ---------------------------------------------------------------------------

function getSortedLanguages(): Array<{
    language_code: string;
    language_name: string;
    language_name_native: string;
}> {
    const allLangs = Object.values(languages.value);
    const played: typeof allLangs = [];
    const unplayed: typeof allLangs = [];

    for (const lang of allLangs) {
        if ((gameResults.value[lang.language_code]?.length ?? 0) > 0) {
            played.push(lang);
        } else {
            unplayed.push(lang);
        }
    }

    // Sort played by most recent game
    played.sort((a, b) => {
        const ra = gameResults.value[a.language_code] || [];
        const rb = gameResults.value[b.language_code] || [];
        const da = ra.length > 0 ? new Date(ra[ra.length - 1]!.date).getTime() : 0;
        const db = rb.length > 0 ? new Date(rb[rb.length - 1]!.date).getTime() : 0;
        return db - da;
    });

    // Sort unplayed by popularity
    unplayed.sort((a, b) => {
        const ia = languagePopularity.value.indexOf(a.language_code);
        const ib = languagePopularity.value.indexOf(b.language_code);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const sorted = [...played, ...unplayed];

    // Move detected browser language to front
    if (detectedLanguageCode.value) {
        const idx = sorted.findIndex((l) => l.language_code === detectedLanguageCode.value);
        if (idx > 0) {
            sorted.unshift(...sorted.splice(idx, 1));
        }
    }

    return sorted;
}

const languagesVis = computed(() => {
    const sorted = getSortedLanguages();
    const q = searchText.value.toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
        (l) =>
            l.language_name.toLowerCase().includes(q) ||
            l.language_name_native.toLowerCase().includes(q) ||
            l.language_code.toLowerCase().includes(q)
    );
});

const otherWordlesVis = computed(() => {
    const list =
        (otherWordles.value as Array<{
            name: string;
            language: string;
            url: string;
        }>) || [];
    const q = searchText.value.toLowerCase();
    if (!q) return list;
    return list.filter(
        (w) => w.name.toLowerCase().includes(q) || w.language.toLowerCase().includes(q)
    );
});

// ---------------------------------------------------------------------------
// Game stats helpers
// ---------------------------------------------------------------------------

function hasPlayed(code: string): boolean {
    return (gameResults.value[code]?.length ?? 0) > 0;
}

function getGamesPlayed(code: string): number {
    return gameResults.value[code]?.length ?? 0;
}

function getCurrentStreak(code: string): number {
    const results = gameResults.value[code];
    if (!results) return 0;
    let streak = 0;
    for (let i = results.length - 1; i >= 0; i--) {
        if (results[i]!.won) streak++;
        else break;
    }
    return streak;
}

function getWinRate(code: string): number {
    const results = gameResults.value[code];
    if (!results || results.length === 0) return 0;
    const wins = results.filter((r) => r.won).length;
    return (wins / results.length) * 100;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function selectLanguageWithCode(code: string, source: 'search' | 'list' | 'flag' = 'list'): void {
    const lang = languages.value[code];
    selectedLangCode.value = code;
    selectedLangName.value = lang?.language_name_native || lang?.language_name || code;
    showModePicker.value = true;
    // Persist language preference so it survives navigation
    detectedLanguageCode.value = code;
    try { writeLocal('preferred_language', code); } catch {}
    if (code !== hpLang.value) {
        hpLangOverride.value = code;
    }
    analytics.trackLanguageSelect(code, source);
}

// Memoized flag lookup to avoid double-calling useFlag in template
const flagCache = new Map<string, string | null>();
function getFlag(code: string): string | null {
    if (flagCache.has(code)) return flagCache.get(code)!;
    const flag = useFlag(code);
    flagCache.set(code, flag);
    return flag;
}

// Track flags that failed to load so we show the initial-letter fallback
const failedFlags = reactive(new Set<string>());
function onFlagError(code: string) {
    failedFlags.add(code);
}
function showFlag(code: string): boolean {
    return !!getFlag(code) && !failedFlags.has(code);
}

// ---------------------------------------------------------------------------
// Homepage mode cards
// ---------------------------------------------------------------------------

const defaultLang = computed(() => detectedLanguageCode.value || 'en');
const defaultLangName = computed(() => {
    const lang = languages.value[defaultLang.value];
    return lang?.language_name_native || lang?.language_name || defaultLang.value;
});
const defaultLangFlag = computed(() =>
    showFlag(defaultLang.value) ? useFlag(defaultLang.value) : null
);

/**
 * Homepage mode cards — NYT-style editorial grid.
 * Each card has mini tile icons, a serif heading, description, and tag.
 */
interface HomepageModeCard {
    id: string;
    icon: any;
    label: string;
    desc: string;
    route: string | null;
    tag: string;
    tagAccent?: boolean;
    opensModal?: boolean;
    /** Show a flag icon when mode is only available in specific languages */
    langFlag?: string | null;
}

const homepageModes = computed((): HomepageModeCard[] => {
    const lang = defaultLang.value;
    const ui = hpUi.value;
    const classic = GAME_MODES_UI.find((m) => m.id === 'classic')!;
    const speed = GAME_MODES_UI.find((m) => m.id === 'speed')!;
    const semanticLangs = GAME_MODE_CONFIG.semantic.languages;
    const isSemanticNative = !semanticLangs || semanticLangs.includes(lang);

    const cards: HomepageModeCard[] = [
        {
            id: 'classic',
            icon: classic.icon,
            label: getModeLabel(classic, ui),
            desc: 'One word per day, per language. The classic. Come back tomorrow for a new challenge.',
            route: getModeRoute(classic, lang),
            tag: 'CLASSIC',
        },
        {
            id: 'semantic',
            icon: Compass,
            label: ui?.mode_semantic_label || 'Semantic Explorer',
            desc: 'Find words by meaning, not by letters. Navigate a map of language.',
            route: '/en/semantic',
            tag: 'NEW',
            tagAccent: true,
            // Show English flag when user's language isn't English
            langFlag: isSemanticNative ? null : useFlag('en'),
        },
    ];

    cards.push(
        {
            id: 'speed',
            icon: speed.icon,
            label: getModeLabel(speed, ui),
            desc: 'Race the clock. Solve as many words as you can before time runs out.',
            route: getModeRoute(speed, lang),
            tag: 'NEW',
            tagAccent: true,
        },
        {
            id: 'multiboard',
            icon: GAME_MODES_UI.find((m) => m.id === 'dordle')?.icon || classic.icon,
            label: ui?.mode_multiboard_label || 'Multi-Board',
            desc: 'Dordle, Quordle, Octordle, and more. Two to thirty-two boards at once.',
            route: null,
            opensModal: true,
            tag: '2–32 BOARDS',
        },
    );

    return cards;
});

function scrollToLanguages(): void {
    document.getElementById('languages')?.scrollIntoView({ behavior: 'smooth' });
}

function handleChangeLanguage(): void {
    showModePicker.value = false;
    setTimeout(scrollToLanguages, 200);
}

function openMultiBoardPicker(): void {
    showBoardPicker.value = true;
}
</script>

<template>
    <AppShell
        :lang="defaultLang"
        :lang-name="defaultLangName"
        :ui="hpUi || undefined"
        home-href="/"
    >
    <div class="pb-12">
        <!-- Announcement bar (disabled — re-enable for future announcements)
        <div
            class="bg-ink dark:bg-accent text-paper dark:text-white font-mono text-[10px] tracking-[0.05em] text-center py-1 px-3 whitespace-nowrap overflow-hidden text-ellipsis"
        >
            Announcement text here
        </div>
        -->

        <!-- ═══ Masthead ═══ -->
        <div class="text-center pt-10 sm:pt-10 mb-12 px-4">
            <h1 class="heading-display text-[40px] sm:text-[56px] text-ink">
                Wordle<span class="text-accent">.</span>Global
            </h1>
            <div class="mono-label mt-2" style="letter-spacing: 0.2em">
                {{ hp.tagline }} &mdash; {{ langCount }} {{ hp.languages }}
            </div>
            <div class="editorial-rule-accent w-[120px] mx-auto mt-4" />
        </div>

        <!-- ═══ Signed-in user greeting (centered, above language) ═══ -->
        <div v-if="authLoggedIn && authUser" class="flex flex-col items-center gap-1 mb-6">
            <NuxtLink to="/profile" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img
                    v-if="authAvatarUrl"
                    :src="authAvatarUrl"
                    alt=""
                    class="w-10 h-10 rounded-full object-cover"
                    referrerpolicy="no-referrer"
                />
                <div v-else class="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center heading-body text-sm">
                    {{ (authUser.displayName || authUser.email || '?')[0]?.toUpperCase() }}
                </div>
                <div class="text-sm font-semibold text-ink">{{ authUser.displayName || 'Player' }}</div>
            </NuxtLink>
            <div v-if="productStreak > 0" class="mono-label flex items-center gap-1" style="color: var(--color-flame);">
                <Flame :size="12" /> {{ productStreak }} day streak
            </div>
            <div v-else class="mono-label flex items-center gap-1 text-muted">
                <Flame :size="12" /> Play today's daily to start a streak
            </div>
        </div>

        <!-- ═══ Language indicator ═══ -->
        <div class="flex items-center justify-center gap-2 mb-6 px-4">
            <img
                v-if="defaultLangFlag"
                :src="defaultLangFlag"
                :alt="defaultLangName"
                class="flag-icon flag-icon-sm"
                @error="onFlagError(defaultLang)"
            />
            <span class="text-sm text-muted">
                {{ hp.playingIn }}
                <span class="font-semibold text-ink">{{ defaultLangName }}</span>
            </span>
            <span class="text-muted">&middot;</span>
            <button
                class="text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors cursor-pointer"
                @click="scrollToLanguages"
            >
                {{ hp.change }}
            </button>
        </div>

        <!-- ═══ Personalized Hub (Tier 1+: has played before) ═══ -->
        <div v-if="isReturningUser" class="max-w-[800px] mx-4 sm:mx-auto mb-10">
            <!-- Streak badge for non-signed-in returning users (Tier 1) -->
            <div v-if="!authLoggedIn" class="flex items-center justify-center gap-1 mb-4">
                <Flame :size="14" :class="productStreak > 0 ? 'text-flame' : 'text-muted'" />
                <span class="mono-label" :style="{ color: productStreak > 0 ? 'var(--color-flame)' : 'var(--color-muted)', fontSize: '12px' }">
                    {{ productStreak > 0 ? `${productStreak} day streak` : 'Play today\'s daily to start a streak' }}
                </span>
            </div>

            <!-- Continue Playing cards -->
            <div v-if="continuePlayingCards.length > 0" class="mb-6">
                <div class="mono-label mb-2 px-1">Continue Playing</div>
                <div class="flex flex-col gap-2">
                    <NuxtLink
                        v-for="card in continuePlayingCards"
                        :key="card.key"
                        :to="card.href"
                        class="flex items-center gap-3 px-4 py-3 border transition-colors hover:bg-paper-warm"
                        :style="{ borderColor: card.borderColor }"
                    >
                        <!-- Stacked icon: mode icon with flag badge -->
                        <div class="relative flex-shrink-0 w-10 h-10">
                            <div class="w-10 h-10 rounded-full border border-rule bg-paper-warm flex items-center justify-center">
                                <component :is="card.modeIcon" :size="18" class="text-ink" />
                            </div>
                            <img
                                v-if="card.flagSrc"
                                :src="card.flagSrc"
                                :alt="card.langName"
                                class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full object-cover border border-paper"
                            />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-ink">{{ card.title }}</div>
                            <div class="text-xs text-muted">{{ card.subtitle }}</div>
                        </div>
                        <div class="flex-shrink-0 flex items-center gap-1.5">
                            <CircleCheck v-if="card.dailySolved" :size="16" class="text-correct" />
                            <template v-else-if="card.streak > 0">
                                <Flame :size="14" class="text-flame" />
                                <span class="mono-label" style="color: var(--color-flame); font-size: 10px;">{{ card.streak }}</span>
                            </template>
                            <span v-else class="mono-label text-muted" style="font-size: 10px;">{{ card.cta }}</span>
                        </div>
                    </NuxtLink>
                </div>
            </div>

            <!-- Sign-in CTA (Tier 1 only) -->
            <button
                v-if="!authLoggedIn"
                class="flex items-center justify-center gap-2 mx-auto mb-4 px-5 py-2 text-xs text-muted hover:text-ink transition-colors cursor-pointer"
                @click="openLoginModal()"
            >
                <User :size="14" />
                <span>Sign in to sync your streak</span>
            </button>

            <!-- PWA install CTA (not installed, not dismissed) -->
            <div
                v-if="showPwaInstall"
                class="flex items-center gap-3 px-4 py-3 border border-rule mb-4"
            >
                <span class="text-xs text-muted flex-1">Install for quick daily access — no app store needed</span>
                <button class="text-xs text-ink font-semibold hover:underline cursor-pointer" @click="pwaInstall?.install()">Install</button>
            </div>

        </div>

        <!-- ═══ Mode Cards ═══ -->
        <div class="max-w-[800px] mx-4 sm:mx-auto mb-14">
            <!-- Daily Puzzle — NYT-style tile card -->
            <NuxtLink
                v-if="homepageModes[0]?.route"
                :to="homepageModes[0].route"
                class="mode-card-hero border border-rule mb-3 transition-colors hover:bg-paper-warm"
                @click="analytics.trackModeSelected('classic', 'homepage_card')"
            >
                <div class="mode-tiles">
                    <span class="mode-tile correct">W</span>
                    <span class="mode-tile semicorrect">O</span>
                    <span class="mode-tile correct">R</span>
                    <span class="mode-tile incorrect">D</span>
                    <span class="mode-tile correct">S</span>
                </div>
                <h3 class="mode-title">{{ homepageModes[0].label }}</h3>
                <p class="mode-desc">{{ homepageModes[0].desc }}</p>
                <span class="editorial-tag self-start">CLASSIC</span>
            </NuxtLink>

            <!-- Other modes — compact list -->
            <div class="flex flex-col gap-2">
                <template v-for="mode in homepageModes.slice(1)" :key="mode.id">
                    <button
                        v-if="mode.opensModal"
                        class="flex items-center gap-4 px-5 py-4 border border-rule transition-colors hover:bg-paper-warm cursor-pointer text-left w-full"
                        @click="openMultiBoardPicker()"
                    >
                        <div class="w-10 h-10 flex items-center justify-center border border-rule bg-paper-warm flex-shrink-0">
                            <component :is="mode.icon" :size="18" class="text-ink" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="heading-section text-base">{{ mode.label }}</div>
                            <div class="text-xs text-muted">{{ mode.desc }}</div>
                        </div>
                        <span v-if="mode.tag" class="editorial-tag flex-shrink-0" :class="mode.tagAccent ? 'editorial-tag-new' : ''">{{ mode.tag }}</span>
                    </button>
                    <NuxtLink
                        v-else-if="mode.route"
                        :to="mode.route"
                        class="flex items-center gap-4 px-5 py-4 border border-rule transition-colors hover:bg-paper-warm"
                        @click="analytics.trackModeSelected(mode.id, 'homepage_card')"
                    >
                        <div class="relative w-10 h-10 flex-shrink-0">
                            <div class="w-10 h-10 flex items-center justify-center border border-rule bg-paper-warm">
                                <component :is="mode.icon" :size="18" class="text-ink" />
                            </div>
                            <img
                                v-if="mode.langFlag"
                                :src="mode.langFlag"
                                alt="English only"
                                class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-paper object-cover"
                            />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="heading-section text-base">{{ mode.label }}</div>
                            <div class="text-xs text-muted">{{ mode.desc }}</div>
                        </div>
                        <span v-if="mode.tag" class="editorial-tag flex-shrink-0" :class="mode.tagAccent ? 'editorial-tag-new' : ''">{{ mode.tag }}</span>
                    </NuxtLink>
                </template>
            </div>
        </div>

        <!-- ═══ Language Section ═══ -->
        <div id="languages" class="max-w-[800px] mx-auto mt-14 px-4">
            <h2
                class="font-display text-[24px] sm:text-[28px] font-light text-center mb-2"
                style="font-variation-settings: 'opsz' 48"
            >
                {{ hp.chooseLanguage }}
            </h2>
            <p class="text-sm text-muted text-center mb-6">
                {{ langCount }} {{ hp.languagesCounting }}
            </p>

            <!-- Search -->
            <input
                v-model="searchText"
                class="block w-full max-w-[400px] mx-auto mb-8 px-4 py-3 border border-rule bg-transparent text-ink font-body text-[15px] focus:outline-none focus:border-ink transition-colors placeholder:text-muted placeholder:italic"
                type="text"
                :placeholder="hp.search"
            />

            <!-- Language grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-rule">
                <a
                    v-for="language in languagesVis"
                    :key="language.language_code"
                    :href="`/${language.language_code}`"
                    class="flex items-center gap-3 text-left border-b border-rule hover:bg-paper-warm transition-colors cursor-pointer no-underline text-inherit"
                    style="padding: 14px 16px"
                    @click.prevent="selectLanguageWithCode(language.language_code)"
                >
                    <img
                        v-if="showFlag(language.language_code)"
                        :src="getFlag(language.language_code)!"
                        :alt="language.language_name"
                        class="flag-icon"
                        @error="onFlagError(language.language_code)"
                    />
                    <div
                        v-else
                        class="flag-icon bg-paper-warm border border-rule flex items-center justify-center text-ink text-[11px] font-display font-bold"
                    >
                        {{ language.language_name_native.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-semibold text-ink truncate">
                            {{ language.language_name_native }}
                        </div>
                        <div class="text-xs text-muted truncate">
                            {{ language.language_name }}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <span
                            v-if="getCurrentStreak(language.language_code) > 0"
                            class="flex items-start gap-0 text-flame"
                        >
                            <Flame :size="14" />
                            <span
                                class="font-mono font-semibold tabular-nums"
                                style="font-size: 9px; line-height: 1; margin-top: 1px"
                            >
                                {{ getCurrentStreak(language.language_code) }}
                            </span>
                        </span>
                        <Check
                            v-else-if="hasPlayed(language.language_code)"
                            :size="14"
                            class="text-correct"
                        />
                    </div>
                </a>
            </div>
        </div>

        <!-- External links hidden for now — SSR handles SEO discoverability -->
        <!-- TODO: Consider adding back as a footer or separate page if users miss it -->

        <!-- ═══ Modals ═══ -->

        <!-- About modal -->
        <SharedBaseModal :visible="showAboutModal" size="sm" @close="showAboutModal = false">
            <div class="flex flex-col gap-3">
                <h3 class="heading-section text-xl text-center mb-2">About</h3>
                <p class="text-center text-sm text-ink">
                    Hi! You probably know about Wordle already. It's a
                    <span class="italic">really</span> fun game.
                </p>
                <p class="text-center text-sm text-ink">
                    The whole thing is open-source. Suggest improvements or fixes at
                    <a
                        href="https://github.com/Hugo0/wordle/issues"
                        class="text-muted underline hover:text-ink"
                        >GitHub</a
                    >.
                </p>
                <p class="text-center text-sm text-ink">
                    There's fun languages, like Klingon or Tolkien's Elvish, plus right-to-left
                    languages like Arabic or Hebrew.
                </p>
                <p class="text-center text-sm text-ink">Have fun!</p>
            </div>
        </SharedBaseModal>

        <!-- Game Mode Picker modal -->
        <AppGameModePicker
            :visible="showModePicker"
            :lang-code="selectedLangCode"
            :language-name="selectedLangName"
            @close="showModePicker = false"
            @select="showModePicker = false"
            @change-language="handleChangeLanguage"
        />

        <!-- Multi-Board Picker modal -->
        <AppBoardPickerModal
            :visible="showBoardPicker"
            :lang-code="defaultLang"
            :ui="hpUi || undefined"
            @close="showBoardPicker = false"
        />
    </div>
    </AppShell>

    <!-- Footer SEO links removed — Nuxt SSR renders all language pages server-side,
         so crawlers discover them via the sitemap and SSR-rendered language grid above.
         The noscript fallback is also unnecessary with SSR. -->
</template>

<style scoped>
/* ═══ Daily Puzzle hero card (NYT-style) ═══ */
.mode-card-hero {
    display: flex;
    flex-direction: column;
    padding: 28px 24px 20px;
}
.mode-tiles {
    display: flex;
    gap: 3px;
    margin-bottom: 14px;
}
.mode-tile {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    border: 1px solid var(--color-rule);
    color: var(--color-ink);
    background: var(--color-paper);
}
.mode-tile.correct {
    background: var(--color-correct);
    border-color: var(--color-correct);
    color: white;
}
.mode-tile.semicorrect {
    background: var(--color-semicorrect);
    border-color: var(--color-semicorrect);
    color: white;
}
.mode-tile.incorrect {
    background: var(--color-incorrect);
    border-color: var(--color-incorrect);
    color: white;
}
.mode-tile.filled {
    background: var(--color-paper);
    border-color: var(--color-ink);
    color: var(--color-ink);
}
.mode-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    font-variation-settings: 'opsz' 72;
    color: var(--color-ink);
    margin-bottom: 6px;
    line-height: 1.2;
}
.mode-desc {
    font-size: 14px;
    color: var(--color-muted);
    line-height: 1.5;
    margin-bottom: 16px;
    flex: 1;
}
</style>
