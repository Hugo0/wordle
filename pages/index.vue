<script setup lang="ts">
/**
 * Homepage — /
 *
 * Language picker with search, showing all available languages.
 * Matches the legacy Flask index.html exactly.
 */
import { useSettingsStore } from '~/stores/settings';
import { Flame, Check, X, Download } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { GAME_MODES_UI, getModeRoute } from '~/composables/useGameModes';

const settings = useSettingsStore();

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const { data: langData } = await useFetch('/api/languages');
const { data: otherWordles } = await useFetch('/api/other-wordles');

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
        `Play Wordle in ${langCount.value}+ languages \u2014 daily puzzle, unlimited mode, speed streak, dordle & quordle. Free word game, no account needed.`
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
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'What is Wordle Global?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: `Wordle Global is a free daily word puzzle game available in ${langCount.value}+ languages. Guess the hidden 5-letter word in 6 tries — a new puzzle every day.`,
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'How many languages does Wordle Global support?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: `Wordle Global currently supports ${langCount.value} languages, including English, Finnish, Spanish, German, Arabic, Hebrew, French, Portuguese, and many more. New languages are added regularly.`,
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'Is Wordle Global free?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Yes, Wordle Global is completely free to play. No account or sign-up required. Just pick a language and start playing.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'What game modes are available?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Wordle Global offers 5 game modes: Classic (daily puzzle), Unlimited (play as many as you want), Speed Streak (race the clock), Dordle (2 boards), and Quordle (4 boards). More modes coming soon.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'How do I play Wordle?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Type a 5-letter word and press Enter. Green means the letter is correct and in the right position. Yellow means the letter is in the word but in the wrong position. Gray means the letter is not in the word. You have 6 tries to guess the word.',
                        },
                    },
                ],
            }),
        },
    ],
});

// Hreflang tags
useHreflang(languageCodes.value);

// ---------------------------------------------------------------------------
// Client-side state
// ---------------------------------------------------------------------------

const searchText = ref('');
const showAboutModal = ref(false);
const showSettingsModal = ref(false);

// Game mode picker
const showModePicker = ref(false);
const selectedLangCode = ref('');
const selectedLangName = ref('');

// Game results from localStorage
const gameResults = ref<
    Record<string, Array<{ won: boolean; attempts: number | string; date: string }>>
>({});
const detectedLanguageCode = ref<string | null>(null);

// PWA install
const canInstallPwa = ref(false);

const analytics = useAnalytics();

onMounted(() => {
    settings.init();

    // Analytics: track homepage view
    analytics.trackHomepageView();

    // Load game results
    try {
        const stored = localStorage.getItem('game_results');
        if (stored) {
            gameResults.value = JSON.parse(stored);
        }
    } catch {
        // ignore
    }

    // Cache languages for game page
    try {
        localStorage.setItem('languages_cache', JSON.stringify(languages.value));
    } catch {
        // ignore
    }

    // Detect browser language
    // Prefer most recently played language, then browser language
    detectedLanguageCode.value = getMostRecentLanguage() || detectBrowserLanguage();

    // Check PWA install availability
    try {
        canInstallPwa.value = !window.matchMedia('(display-mode: standalone)').matches;
    } catch {
        canInstallPwa.value = false;
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
        showSettingsModal.value = false;
    }
}

function installPwa(): void {
    const nuxtApp = useNuxtApp();
    const pwa = (nuxtApp as any).$pwaInstall as { install: () => void } | undefined;
    if (pwa) {
        pwa.install();
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

// ---------------------------------------------------------------------------
// Homepage mode cards
// ---------------------------------------------------------------------------

const defaultLang = computed(() => detectedLanguageCode.value || 'en');
const defaultLangName = computed(() => {
    const lang = languages.value[defaultLang.value];
    return lang?.language_name_native || lang?.language_name || defaultLang.value;
});
const defaultLangFlag = computed(() => useFlag(defaultLang.value));

// Homepage shows first 5 modes from shared source + "& More" card
const HOMEPAGE_MODE_IDS = ['classic', 'unlimited', 'speed', 'dordle', 'quordle'];

const homepageModes = computed(() => {
    const lang = defaultLang.value;
    const featured = GAME_MODES_UI.filter((m) => HOMEPAGE_MODE_IDS.includes(m.id)).map((m) => ({
        id: m.id,
        icon: m.icon,
        label: m.label,
        desc: m.description,
        tag: m.badge || '',
        route: getModeRoute(m, lang),
    }));
    featured.push({
        id: 'more',
        icon: null as any,
        label: '& More',
        desc: 'Quordle, Semantic Explorer, Custom Word, Party Mode — and more coming soon.',
        tag: 'EXPLORE',
        route: null,
    });
    return featured;
});

function scrollToLanguages(): void {
    document.getElementById('languages')?.scrollIntoView({ behavior: 'smooth' });
}

function handleChangeLanguage(): void {
    showModePicker.value = false;
    setTimeout(scrollToLanguages, 200);
}

function openMoreModes(): void {
    const code = defaultLang.value;
    const lang = languages.value[code];
    selectedLangCode.value = code;
    selectedLangName.value = lang?.language_name_native || lang?.language_name || code;
    showModePicker.value = true;
}

function openLink(url: string): void {
    if (import.meta.client) {
        window.open(url);
    }
}
</script>

<template>
    <div class="pb-12">
        <!-- ═══ Announcement Bar ═══ -->
        <div
            class="bg-ink dark:bg-accent text-paper dark:text-white font-mono text-[10px] tracking-[0.05em] text-center py-1 px-3 whitespace-nowrap overflow-hidden text-ellipsis"
        >
            &#127881; New game modes! Unlimited, Speed Streak, Dordle &amp; Quordle
        </div>

        <!-- ═══ Masthead ═══ -->
        <div class="text-center pt-10 sm:pt-10 mb-12 px-4">
            <h1 class="heading-display text-[40px] sm:text-[56px] text-ink">
                Wordle<span class="text-accent">.</span>Global
            </h1>
            <div class="mono-label mt-2" style="letter-spacing: 0.2em">
                The world's word game &mdash; {{ langCount }} languages
            </div>
            <div class="editorial-rule-accent w-[120px] mx-auto mt-4" />
        </div>

        <!-- ═══ Language indicator ═══ -->
        <div class="flex items-center justify-center gap-2 mb-6 px-4">
            <img
                v-if="defaultLangFlag"
                :src="defaultLangFlag"
                :alt="defaultLangName"
                class="flag-icon flag-icon-sm"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <span class="text-sm text-muted">
                Playing in
                <span class="font-semibold text-ink">{{ defaultLangName }}</span>
            </span>
            <span class="text-muted">&middot;</span>
            <button
                class="text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors cursor-pointer"
                @click="scrollToLanguages"
            >
                change
            </button>
        </div>

        <!-- ═══ Mode Cards ═══ -->
        <div
            class="grid grid-cols-1 sm:grid-cols-3 border border-rule max-w-[800px] mx-4 sm:mx-auto mb-14"
            style="background: var(--color-rule); gap: 1px"
        >
            <template v-for="mode in homepageModes" :key="mode.id">
                <NuxtLink
                    v-if="mode.route"
                    :to="mode.route"
                    class="bg-paper py-8 px-7 text-left transition-colors flex flex-col hover:bg-paper-warm cursor-pointer"
                    @click="analytics.trackModeSelected(mode.id, 'homepage_card')"
                >
                    <div class="flex gap-1 mb-3">
                        <component :is="mode.icon" :size="18" class="text-ink" />
                    </div>
                    <div class="heading-section text-[22px] mb-1.5">{{ mode.label }}</div>
                    <p class="text-sm text-muted leading-[1.45] flex-1">{{ mode.desc }}</p>
                    <span
                        class="editorial-tag mt-3 self-start"
                        :class="mode.tag === 'NEW' ? 'editorial-tag-new' : ''"
                    >
                        {{ mode.tag }}
                    </span>
                </NuxtLink>
                <button
                    v-else
                    class="bg-paper py-8 px-7 text-left transition-colors flex flex-col hover:bg-paper-warm cursor-pointer"
                    @click="openMoreModes()"
                >
                    <div class="flex gap-1 mb-3">
                        <span class="text-muted text-lg">···</span>
                    </div>
                    <div class="heading-section text-[22px] mb-1.5">{{ mode.label }}</div>
                    <p class="text-sm text-muted leading-[1.45] flex-1">{{ mode.desc }}</p>
                    <span class="editorial-tag mt-3 self-start">
                        {{ mode.tag }}
                    </span>
                </button>
            </template>
        </div>

        <!-- ═══ Language Section ═══ -->
        <div id="languages" class="max-w-[800px] mx-auto mt-14 px-4">
            <h2
                class="font-display text-[24px] sm:text-[28px] font-light text-center mb-2"
                style="font-variation-settings: 'opsz' 48"
            >
                Choose your language
            </h2>
            <p class="text-sm text-muted text-center mb-6">
                {{ langCount }} languages and counting — more added regularly.
            </p>

            <!-- Search -->
            <input
                v-model="searchText"
                class="block w-full max-w-[400px] mx-auto mb-8 px-4 py-3 border border-rule bg-transparent text-ink font-body text-[15px] focus:outline-none focus:border-ink transition-colors placeholder:text-muted placeholder:italic"
                type="text"
                placeholder="Search languages..."
            />

            <!-- Language grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-rule">
                <button
                    v-for="language in languagesVis"
                    :key="language.language_code"
                    class="flex items-center gap-3 text-left border-b border-rule hover:bg-paper-warm transition-colors cursor-pointer"
                    style="padding: 14px 16px"
                    @click="selectLanguageWithCode(language.language_code)"
                >
                    <img
                        v-if="getFlag(language.language_code)"
                        :src="getFlag(language.language_code)!"
                        :alt="language.language_name"
                        class="flag-icon"
                        @error="
                            ($event.target as HTMLImageElement).style.display = 'none';
                            (
                                $event.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove('hidden');
                        "
                    />
                    <div
                        :class="[
                            'flag-icon bg-paper-warm border border-rule flex items-center justify-center text-ink text-[11px] font-display font-bold',
                            { hidden: !!getFlag(language.language_code) },
                        ]"
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
                </button>
            </div>
        </div>

        <!-- External links hidden for now — SSR handles SEO discoverability -->
        <!-- TODO: Consider adding back as a footer or separate page if users miss it -->

        <!-- ═══ Modals ═══ -->

        <!-- About modal -->
        <div
            v-show="showAboutModal"
            class="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] px-3 pb-4 overflow-y-auto"
        >
            <div
                class="fixed inset-0 bg-ink/25"
                aria-hidden="true"
                @click="showAboutModal = false"
            />
            <div
                class="relative z-10 bg-paper border border-rule shadow-lg p-6 w-full max-w-xs sm:max-w-lg"
            >
                <div class="flex flex-col gap-3 relative">
                    <button
                        type="button"
                        aria-label="Close"
                        class="absolute top-0 end-0 p-1 text-muted hover:text-ink"
                        @click="showAboutModal = false"
                    >
                        <X :size="20" />
                    </button>
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
            </div>
        </div>

        <!-- Settings modal -->
        <div
            v-show="showSettingsModal"
            class="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] px-3 pb-4 overflow-y-auto"
        >
            <div
                class="fixed inset-0 bg-ink/25"
                aria-hidden="true"
                @click="showSettingsModal = false"
            />
            <div
                class="relative z-10 bg-paper border border-rule shadow-lg p-6 w-full max-w-xs sm:max-w-md"
            >
                <div class="flex flex-col gap-4 relative">
                    <button
                        type="button"
                        aria-label="Close"
                        class="absolute top-0 end-0 p-1 text-muted hover:text-ink"
                        @click="showSettingsModal = false"
                    >
                        <X :size="20" />
                    </button>
                    <h3 class="heading-section text-xl text-center mb-2">Settings</h3>

                    <div class="flex flex-row items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium text-ink">Dark Mode</span>
                            <span class="text-xs text-muted">Toggle dark theme</span>
                        </div>
                        <SharedToggleSwitch
                            :model-value="settings.darkMode"
                            @update:model-value="settings.toggleDarkMode()"
                        />
                    </div>

                    <hr class="border-rule" />

                    <div class="flex flex-row items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium text-ink">Sound &amp; Haptics</span>
                        </div>
                        <SharedToggleSwitch
                            :model-value="settings.feedbackEnabled"
                            @update:model-value="settings.toggleFeedback()"
                        />
                    </div>

                    <hr class="border-rule" />

                    <div v-if="canInstallPwa" class="pt-2">
                        <button
                            class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-correct hover:opacity-90 text-white font-medium transition-opacity"
                            @click="installPwa"
                        >
                            <Download :size="18" />
                            Install App
                        </button>
                        <p class="text-xs text-center text-muted mt-1">
                            Play offline &amp; get app icon
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Game Mode Picker modal -->
        <AppGameModePicker
            :visible="showModePicker"
            :lang-code="selectedLangCode"
            :language-name="selectedLangName"
            @close="showModePicker = false"
            @select="showModePicker = false"
            @change-language="handleChangeLanguage"
        />
    </div>

    <!-- Footer SEO links removed — Nuxt SSR renders all language pages server-side,
         so crawlers discover them via the sitemap and SSR-rendered language grid above.
         The noscript fallback is also unnecessary with SSR. -->
</template>
