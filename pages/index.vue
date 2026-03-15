<script setup lang="ts">
/**
 * Homepage — /
 *
 * Language picker with search, showing all available languages.
 * Matches the legacy Flask index.html exactly.
 */
import { useSettingsStore } from '~/stores/settings';

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
        `Play Wordle today in ${langCount.value}+ languages \u2014 free, daily 5-letter word puzzle. Guess the word in 6 tries. No account needed. Available in English, Spanish, German, Arabic, Hebrew, Finnish and more.`
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

useHead({
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
        {
            name: 'keywords',
            content: 'wordle, english, puzzle, word, play, game, online, guess, free, daily',
        },
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
const showPopup = ref(false);
const clickedLanguage = ref('');

// Game results from localStorage
const gameResults = ref<
    Record<string, Array<{ won: boolean; attempts: number | string; date: string }>>
>({});
const detectedLanguageCode = ref<string | null>(null);

// PWA install
const canInstallPwa = ref(false);

onMounted(() => {
    settings.init();

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
    detectedLanguageCode.value = detectBrowserLanguage();

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

function selectLanguageWithCode(code: string): void {
    navigateTo(`/${code}`);
}

function openLink(url: string): void {
    if (import.meta.client) {
        window.open(url);
    }
}
</script>

<template>
    <div class="pb-12">
        <!-- The Header -->
        <header
            class="relative flex flex-row justify-between items-center p-1 px-3 lg:px-1 h-[50px] my-auto border-b border-neutral-300 dark:border-neutral-600 max-w-screen-sm mx-auto"
        >
            <button
                class="z-30 text-neutral-500 dark:text-neutral-400"
                aria-label="about"
                @click="showAboutModal = !showAboutModal"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler icon-tabler-info-circle"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                    <polyline points="11 12 12 12 12 16 13 16" />
                </svg>
            </button>
            <div class="absolute right-0 left-0 text-center">
                <h1 class="uppercase font-bold text-xl tiny:text-3xl sm:text-4xl tracking-wider">
                    <NuxtLink to="/">WORDLE &#127757;</NuxtLink>
                </h1>
            </div>
            <div class="flex flex-row gap-3 z-30">
                <NuxtLink
                    to="/stats"
                    class="m-0 sm:my-1 text-neutral-500 dark:text-neutral-400"
                    aria-label="statistics"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <rect x="3" y="12" width="6" height="8" rx="1" />
                        <rect x="9" y="8" width="6" height="12" rx="1" />
                        <rect x="15" y="4" width="6" height="16" rx="1" />
                        <line x1="4" y1="20" x2="18" y2="20" />
                    </svg>
                </NuxtLink>
                <button
                    class="m-0 sm:my-1 text-neutral-500 dark:text-neutral-400"
                    aria-label="settings"
                    @click="showSettingsModal = !showSettingsModal"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path
                            d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"
                        />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            </div>
        </header>

        <!-- language search box -->
        <div class="flex justify-center mt-12">
            <div
                class="flex flex-col break-words bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 rounded shadow-md mx-4 mb-2 sm:mb-6 w-full max-w-xs md:max-w-sm lg:max-w-md"
            >
                <input
                    v-model="searchText"
                    class="shadow appearance-none w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-neutral-800 leading-tight focus:outline-none focus:shadow-outline hover:shadow-xl"
                    type="text"
                    placeholder="Search language..."
                />
            </div>
        </div>

        <!-- tailwind grid of language cards that fill max space -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7 mt-7 sm:gap-10 sm:mt-10 md:gap-14 mt-14 w-2/3 mx-auto"
        >
            <!-- card for each language -->
            <button
                v-for="language in languagesVis"
                :key="language.language_code"
                class="group col-span-1 cursor-pointer rounded-lg shadow-lg hover:shadow-2xl"
                @click="selectLanguageWithCode(language.language_code)"
            >
                <div
                    class="h-full border-2 rounded-lg group-hover:font-bold transition-colors"
                    :class="
                        hasPlayed(language.language_code)
                            ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 group-hover:bg-green-100 dark:group-hover:bg-green-900/40'
                            : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-700'
                    "
                >
                    <div class="px-5 py-4 relative">
                        <!-- Streak badge (top right) -->
                        <span
                            v-if="getCurrentStreak(language.language_code) > 0"
                            class="absolute top-2 right-2 text-orange-500 dark:text-orange-400 text-xs font-bold flex items-center gap-0.5"
                        >
                            <span>&#128293;</span>{{ getCurrentStreak(language.language_code) }}
                        </span>
                        <!-- Checkmark for played but no streak -->
                        <span
                            v-else-if="hasPlayed(language.language_code)"
                            class="absolute top-2 right-2 text-green-500 dark:text-green-400 text-xs"
                            >&#10003;</span
                        >

                        <h5 class="text-center">
                            {{ language.language_name_native }}
                        </h5>
                        <p
                            class="text-sm italic text-neutral-600 dark:text-neutral-400 text-center"
                        >
                            {{ language.language_name }}
                        </p>

                        <!-- Games played indicator -->
                        <p
                            v-if="hasPlayed(language.language_code)"
                            class="text-xs text-neutral-500 dark:text-neutral-500 text-center mt-1"
                        >
                            {{ getGamesPlayed(language.language_code) }}
                            game<span v-if="getGamesPlayed(language.language_code) !== 1">s</span>
                            &middot;
                            {{ Math.round(getWinRate(language.language_code)) }}% wins
                        </p>
                    </div>
                </div>
            </button>
        </div>

        <!-- separator — Other Wordles -->
        <div class="w-full mt-16 mx-auto text-center">
            <hr class="border-b-1 border-gray-400 dark:border-gray-600 w-1/2 mx-auto" />
            <h2 class="text-2xl text-neutral-500 dark:text-neutral-400 mt-4">External Links</h2>
        </div>

        <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-16 mt-16 w-2/3 mx-auto"
        >
            <button
                v-for="otherWordle in otherWordlesVis"
                :key="otherWordle.url"
                class="col-span-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg shadow-lg"
                @click="openLink(otherWordle.url)"
            >
                <div
                    class="shadow-lg h-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded-lg hover:shadow-2xl hover:font-bold"
                >
                    <div class="px-5 py-4">
                        <h5>{{ otherWordle.name }}</h5>
                        <p class="text-sm italic text-neutral-600 dark:text-neutral-400">
                            {{ otherWordle.language }}
                        </p>
                    </div>
                </div>
            </button>
        </div>

        <!-- NOTIFICATIONS & MODALS -->
        <div
            class="container mx-auto flex w-full max-w-lg justify-center items-center overflow-auto z-1"
        >
            <!-- Modal backdrop -->
            <SharedModalBackdrop
                :visible="showAboutModal || showSettingsModal"
                @close="
                    showAboutModal = false;
                    showSettingsModal = false;
                "
            />

            <!-- About modal -->
            <div
                v-show="showAboutModal"
                class="fixed top-10 left-0 w-full h-full z-50 items-center overflow-auto"
            >
                <div
                    class="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-xs sm:max-w-lg"
                >
                    <div class="flex flex-col gap-2 relative">
                        <button
                            type="button"
                            aria-label="Close"
                            class="absolute top-0 right-0 p-1 ml-auto z-50"
                            @click="showAboutModal = false"
                        >
                            <span
                                class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"
                                >&times;</span
                            >
                        </button>
                        <h3 class="flex mx-auto uppercase font-bold text-2xl tracking-wider mb-2">
                            About
                        </h3>
                        <p class="text-center text-sm">
                            Hi! You probably know about Wordle already. It's a
                            <span class="italic">really</span> fun game.
                        </p>
                        <p class="text-center text-sm">
                            My skills are mostly in backend/ML, with lacking frontend experience. I
                            wanted to change that, so why not recreate one of my favorite current
                            games? The aim was to make something useful whilst also learning a lot.
                        </p>
                        <p class="text-center text-sm">
                            The whole thing is open-source, and you can (and actually, please do)
                            suggest improvements or fixes over at
                            <a
                                href="https://github.com/Hugo0/wordle/issues"
                                class="text-neutral-500 dark:text-neutral-400 underline"
                                >GitHub</a
                            >
                        </p>
                        <p class="text-center text-sm">
                            There's fun languages, like Klingon or Tolkien's Elvish that you can
                            measure yourself on, as well as right to left languages like Arabic or
                            Hebrew. Stats
                            <a
                                href="/stats"
                                target="_blank"
                                class="text-neutral-500 dark:text-neutral-400 underline"
                                >here</a
                            >.
                        </p>
                        <p class="text-center text-sm">
                            A lot of other great Wordle spin-offs exist, and I've linked a bunch
                            below for easy access. (credit:
                            <a
                                href="https://rwmpelstilzchen.gitlab.io/wordles/"
                                class="text-neutral-500 dark:text-neutral-400 underline"
                                >Wordles of the World</a
                            >)
                        </p>
                        <p class="text-center text-sm">Have fun, and I hope you enjoy!</p>
                    </div>
                </div>
            </div>

            <!-- Settings modal -->
            <div
                v-show="showSettingsModal"
                class="fixed top-10 left-0 w-full h-full z-50 items-center overflow-auto"
            >
                <div
                    class="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-xs sm:max-w-md"
                >
                    <div class="flex flex-col gap-4 relative">
                        <button
                            type="button"
                            aria-label="Close"
                            class="absolute top-0 right-0 p-1 ml-auto z-50"
                            @click="showSettingsModal = false"
                        >
                            <span
                                class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"
                                >&times;</span
                            >
                        </button>
                        <h3 class="flex mx-auto uppercase font-bold text-2xl tracking-wider mb-2">
                            Settings
                        </h3>

                        <!-- Dark Mode Toggle -->
                        <div class="flex flex-row items-center justify-between">
                            <div class="flex flex-col">
                                <span class="font-medium">Dark Mode</span>
                                <span class="text-sm text-neutral-500 dark:text-neutral-400"
                                    >Toggle dark theme</span
                                >
                            </div>
                            <SharedToggleSwitch
                                :model-value="settings.darkMode"
                                @update:model-value="settings.toggleDarkMode()"
                            />
                        </div>

                        <!-- Separator -->
                        <hr class="border-neutral-300 dark:border-neutral-600" />

                        <!-- Sound & Haptics Toggle -->
                        <div class="flex flex-row items-center justify-between">
                            <div class="flex flex-col">
                                <span class="font-medium">Sound &amp; Haptics</span>
                            </div>
                            <SharedToggleSwitch
                                :model-value="settings.feedbackEnabled"
                                @update:model-value="settings.toggleFeedback()"
                            />
                        </div>

                        <!-- Separator -->
                        <hr class="border-neutral-300 dark:border-neutral-600" />

                        <!-- Install App button (only shown when not already installed) -->
                        <div v-if="canInstallPwa" class="pt-2">
                            <button
                                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                                @click="installPwa"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-5 w-5"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke-width="2"
                                    stroke="currentColor"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path
                                        d="M12 18h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v7.5"
                                    />
                                    <path d="M16 19h6" />
                                    <path d="M19 16v6" />
                                </svg>
                                Install App
                            </button>
                            <p
                                class="text-xs text-center text-neutral-500 dark:text-neutral-400 mt-1"
                            >
                                Play offline &amp; get app icon
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Popup for if a language is unavailable -->
        <div v-if="showPopup" class="fixed top-0 left-0 w-full h-full z-50">
            <div class="flex items-center justify-center w-full h-full">
                <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4">
                    <div class="flex flex-col items-center">
                        <h3 class="text-2xl font-bold text-center">&#128119;&#128679;</h3>
                        <br />
                        <p class="text-center">{{ clickedLanguage }} &nbsp; is coming soon!</p>
                        <button class="mt-4" @click="showPopup = false">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- shadow -->
        <div v-if="showPopup" class="opacity-25 fixed top-0 left-0 w-full h-full z-1 bg-black" />
    </div>

    <!-- Server-rendered language links — crawlable by search engines even without JS -->
    <nav id="language-links" class="max-w-2xl mx-auto px-4 py-8 text-center">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
            Play Wordle in Your Language
        </h2>
        <div class="flex flex-wrap justify-center gap-2">
            <NuxtLink
                v-for="lc in [...languageCodes].sort()"
                :key="lc"
                :to="`/${lc}`"
                class="text-sm px-2 py-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
                {{ languages[lc]?.language_name || lc }}
            </NuxtLink>
        </div>
    </nav>

    <!-- noscript block for SEO -->
    <noscript>
        <nav class="max-w-2xl mx-auto px-4 py-8 text-center">
            <h2>Play Wordle in Your Language</h2>
            <p>JavaScript is required to play the game, but here are links to all languages:</p>
        </nav>
    </noscript>
</template>
