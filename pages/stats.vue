<script setup lang="ts">
/**
 * Stats — /stats
 *
 * Two-tab layout: "Languages" (server data) and "My Stats" (localStorage).
 * Matches legacy stats.html template.
 */

const { data: stats } = await useFetch('/api/stats');

const title = computed(() =>
    stats.value
        ? `Wordle Global Stats \u2014 ${stats.value.total_languages} Languages, ${stats.value.total_words.toLocaleString()} Words`
        : 'Wordle Global Stats'
);
const description = computed(() =>
    stats.value
        ? `Wordle Global statistics: ${stats.value.total_languages} languages, ${stats.value.total_words.toLocaleString()} words, and ${stats.value.total_puzzles.toLocaleString()} daily puzzles served. See word counts, community win rates, and more.`
        : 'Wordle Global statistics across all languages.'
);

useSeoMeta({
    title,
    description,
    ogTitle: 'Wordle Global Stats',
    ogDescription: computed(() =>
        stats.value
            ? `${stats.value.total_languages} languages, ${stats.value.total_words.toLocaleString()} words. Free daily word game in dozens of languages.`
            : 'Wordle Global statistics.'
    ),
    ogUrl: 'https://wordle.global/stats',
    ogType: 'website',
    twitterCard: 'summary',
    twitterTitle: 'Wordle Global Stats',
    twitterDescription: computed(() =>
        stats.value
            ? `${stats.value.total_languages} languages, ${stats.value.total_words.toLocaleString()} words. Free daily word game in dozens of languages.`
            : 'Wordle Global statistics.'
    ),
});

useHead({
    link: [{ rel: 'canonical', href: 'https://wordle.global/stats' }],
});

// Tab switching
const activeTab = ref<'languages' | 'my-stats'>('languages');

function switchTab(tab: 'languages' | 'my-stats') {
    activeTab.value = tab;
    if (tab === 'my-stats') loadMyStats();
}

const tabClasses = (tab: string) =>
    tab === activeTab.value
        ? 'flex-1 py-2 text-sm font-medium transition-colors border-b-2 text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200'
        : 'flex-1 py-2 text-sm font-medium transition-colors border-b-2 text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300';

// Color classes for daily word count
function dailyCountClass(n: number): string {
    if (n >= 2000) return 'text-green-600 dark:text-green-400';
    if (n >= 1000) return 'text-yellow-600 dark:text-yellow-400';
    if (n > 0) return 'text-orange-500';
    return 'text-neutral-300 dark:text-neutral-600';
}

function winRateClass(rate: number | null): string {
    if (rate === null) return 'text-neutral-300 dark:text-neutral-600';
    if (rate >= 70) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
}

// ========== My Stats (localStorage) ==========

interface PerLangStats {
    code: string;
    name: string;
    nameNative: string;
    games: number;
    wins: number;
    losses: number;
    winPct: number;
    avgAttempts: string;
    streak: number;
    best: number;
}

const myStatsLoaded = ref(false);
const myStatsEmpty = ref(false);
const myTotalGames = ref(0);
const myWinRate = ref('0%');
const myCurrentStreak = ref(0);
const myLanguagesWon = ref(0);
const myAvgAttempts = ref('-');
const myBestStreak = ref(0);
const myDist = ref<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
const myPerLang = ref<PerLangStats[]>([]);

function loadMyStats() {
    if (myStatsLoaded.value) return;
    myStatsLoaded.value = true;

    let raw: string | null = null;
    try {
        raw = localStorage.getItem('game_results');
    } catch {
        // private browsing
    }
    const gameResults: Record<
        string,
        Array<{ won: boolean; attempts: string | number; date: string }>
    > = raw ? JSON.parse(raw) : {};
    const langCodes = Object.keys(gameResults);

    if (langCodes.length === 0) {
        myStatsEmpty.value = true;
        return;
    }

    // Language name cache
    let langCache: Record<string, { language_name?: string; language_name_native?: string }> = {};
    try {
        langCache = JSON.parse(localStorage.getItem('languages_cache') || '{}');
    } catch {
        // ignore
    }

    let totalGames = 0;
    let totalWins = 0;
    let totalAttempts = 0;
    let longestOverallStreak = 0;
    let currentOverallStreak = 0;
    let languagesWon = 0;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const perLang: PerLangStats[] = [];

    // All results sorted by date for overall streak
    const allResults: Array<{ won: boolean; attempts: string | number; date: string }> = [];
    for (const lc of langCodes) {
        for (const r of gameResults[lc]!) {
            allResults.push(r);
        }
    }
    allResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const r of allResults) {
        if (r.won) {
            currentOverallStreak++;
            if (currentOverallStreak > longestOverallStreak)
                longestOverallStreak = currentOverallStreak;
            const att = parseInt(String(r.attempts), 10);
            if (att >= 1 && att <= 6) {
                dist[att]!++;
                totalAttempts += att;
            }
            totalWins++;
        } else {
            currentOverallStreak = 0;
        }
        totalGames++;
    }

    for (const lc of langCodes) {
        const results = gameResults[lc]!;
        let wins = 0;
        let losses = 0;
        let attempts = 0;
        let streak = 0;
        let best = 0;
        for (const r of results) {
            if (r.won) {
                wins++;
                streak++;
                if (streak > best) best = streak;
                const att = parseInt(String(r.attempts), 10);
                if (!isNaN(att)) attempts += att;
            } else {
                losses++;
                streak = 0;
            }
        }
        if (wins > 0) languagesWon++;

        const langName = langCache[lc]?.language_name || lc;
        const langNameNative = langCache[lc]?.language_name_native || '';

        perLang.push({
            code: lc,
            name: langName,
            nameNative: langNameNative,
            games: wins + losses,
            wins,
            losses,
            winPct: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
            avgAttempts: wins > 0 ? (attempts / wins).toFixed(1) : '-',
            streak,
            best,
        });
    }

    perLang.sort((a, b) => b.games - a.games);

    myTotalGames.value = totalGames;
    myWinRate.value = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) + '%' : '0%';
    myCurrentStreak.value = currentOverallStreak;
    myLanguagesWon.value = languagesWon;
    myAvgAttempts.value = totalWins > 0 ? (totalAttempts / totalWins).toFixed(1) : '-';
    myBestStreak.value = longestOverallStreak;
    myDist.value = dist;
    myPerLang.value = perLang;
}

const myMaxDist = computed(() => Math.max(...Object.values(myDist.value), 1));

function myDistPct(n: number): string {
    const count = myDist.value[n] || 0;
    const pct = count > 0 ? Math.max((count / myMaxDist.value) * 100, 8) : 0;
    return `${pct}%`;
}
</script>

<template>
    <div
        class="min-h-screen bg-white dark:bg-neutral-900 text-black dark:text-white transition-colors"
    >
        <div class="max-w-4xl mx-auto px-4 py-6">
            <!-- Header -->
            <header class="text-center mb-6">
                <NuxtLink
                    to="/"
                    class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    &larr; Home
                </NuxtLink>
                <h1 class="text-2xl font-bold mt-2">Wordle Global Stats</h1>
                <p v-if="stats" class="text-sm text-neutral-500 dark:text-neutral-400">
                    The free daily word game in {{ stats.total_languages }} languages
                </p>
            </header>

            <!-- Tab bar -->
            <div
                class="flex border-b border-neutral-200 dark:border-neutral-700 mb-4 max-w-lg mx-auto"
                role="tablist"
            >
                <button
                    role="tab"
                    :aria-selected="activeTab === 'my-stats'"
                    aria-controls="panel-my-stats"
                    :class="tabClasses('my-stats')"
                    @click="switchTab('my-stats')"
                >
                    My Stats
                </button>
                <button
                    role="tab"
                    :aria-selected="activeTab === 'languages'"
                    aria-controls="panel-languages"
                    :class="tabClasses('languages')"
                    @click="switchTab('languages')"
                >
                    Languages
                </button>
            </div>

            <!-- ===== MY STATS TAB ===== -->
            <div
                v-show="activeTab === 'my-stats'"
                id="panel-my-stats"
                role="tabpanel"
                aria-labelledby="tab-my-stats"
            >
                <div class="max-w-lg mx-auto">
                    <!-- Empty state -->
                    <div v-if="myStatsEmpty" class="text-center py-8">
                        <p class="text-neutral-500 dark:text-neutral-400 mb-4">
                            You haven't played any games yet.
                        </p>
                        <NuxtLink
                            to="/"
                            class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-green-500 hover:bg-green-600 transition-colors"
                        >
                            Pick a Language
                        </NuxtLink>
                    </div>

                    <!-- Stats content -->
                    <div v-else-if="myStatsLoaded && !myStatsEmpty">
                        <!-- Summary grid -->
                        <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ myTotalGames.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Games Played
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">{{ myWinRate }}</p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Win Rate
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ myCurrentStreak > 0 ? '\uD83D\uDD25' : ''
                                        }}{{ myCurrentStreak }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Current Streak
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">{{ myLanguagesWon }}</p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Languages Won
                                    </p>
                                </div>
                            </div>
                            <!-- Secondary row -->
                            <div
                                class="grid grid-cols-2 gap-3 text-center mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700"
                            >
                                <div>
                                    <p class="text-lg font-bold">{{ myAvgAttempts }}</p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Avg Attempts
                                    </p>
                                </div>
                                <div>
                                    <p class="text-lg font-bold">{{ myBestStreak }}</p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Best Streak
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Guess distribution -->
                        <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                            <h2
                                class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 text-center"
                            >
                                Guess Distribution
                            </h2>
                            <div class="space-y-0.5">
                                <div v-for="n in 6" :key="n" class="flex items-center gap-1.5">
                                    <span class="w-3 text-xs font-medium text-neutral-500">{{
                                        n
                                    }}</span>
                                    <div
                                        class="flex-1 h-5 bg-gray-100 dark:bg-neutral-700 rounded-sm overflow-hidden"
                                    >
                                        <div
                                            class="h-full flex items-center justify-end px-1.5 text-[10px] font-bold text-white rounded-sm bg-green-500"
                                            :style="{ width: myDistPct(n) }"
                                        >
                                            {{ myDist[n] || 0 }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Per-language list -->
                        <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                            <h2
                                class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3"
                            >
                                Your Languages
                            </h2>
                            <div class="space-y-2 max-h-80 overflow-y-auto">
                                <div
                                    v-for="l in myPerLang"
                                    :key="l.code"
                                    class="flex items-center justify-between py-2 px-3 bg-white dark:bg-neutral-700/50 rounded-lg"
                                >
                                    <div>
                                        <NuxtLink
                                            :to="`/${l.code}`"
                                            class="font-medium text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {{ l.name }}
                                        </NuxtLink>
                                        <span
                                            v-if="l.nameNative && l.nameNative !== l.name"
                                            class="text-xs text-neutral-400 ml-1"
                                        >
                                            {{ l.nameNative }}
                                        </span>
                                    </div>
                                    <div
                                        class="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400"
                                    >
                                        <span>{{ l.games }} games</span>
                                        <span>{{ l.winPct }}%</span>
                                        <span>{{ l.avgAttempts }} avg</span>
                                        <span v-if="l.streak > 0" class="text-orange-500 font-bold">
                                            &#x1F525;{{ l.streak }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== LANGUAGES TAB ===== -->
            <div
                v-show="activeTab === 'languages'"
                id="panel-languages"
                role="tabpanel"
                aria-labelledby="tab-languages"
            >
                <template v-if="stats">
                    <!-- Global Stats overview -->
                    <div class="max-w-lg mx-auto">
                        <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                            <h2
                                class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3 text-center"
                            >
                                Overview
                            </h2>
                            <div class="grid grid-cols-3 gap-3 text-center">
                                <div>
                                    <p class="text-xl font-bold text-green-500">
                                        {{ stats.total_languages }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Languages
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ stats.total_words.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Total Words
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ stats.total_daily_words.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Daily Word Pool
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">{{ stats.n_curated }}</p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Curated Languages
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ stats.todays_idx.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Days Running
                                    </p>
                                </div>
                                <div>
                                    <p class="text-xl font-bold">
                                        {{ stats.total_puzzles.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Puzzles Served
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Community Stats -->
                        <div
                            v-if="stats.global_plays > 0"
                            class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4"
                        >
                            <h2
                                class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1 text-center"
                            >
                                Community Stats
                            </h2>
                            <p
                                v-if="stats.stats_since_date"
                                class="text-[10px] text-neutral-400 dark:text-neutral-500 text-center mb-3"
                            >
                                Since {{ stats.stats_since_date }}
                            </p>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p class="text-lg font-bold">
                                        {{ stats.global_plays.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Games Played
                                    </p>
                                </div>
                                <div>
                                    <p class="text-lg font-bold">
                                        {{ stats.global_wins.toLocaleString() }}
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Games Won
                                    </p>
                                </div>
                                <div>
                                    <p class="text-lg font-bold text-green-500">
                                        {{ stats.global_win_rate }}%
                                    </p>
                                    <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                                        Win Rate
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Language table -->
                    <div class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                        <h2
                            class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3 text-center"
                        >
                            All Languages ({{ stats.total_languages }})
                        </h2>
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr
                                        class="text-left text-neutral-400 dark:text-neutral-500 border-b border-neutral-200 dark:border-neutral-700"
                                    >
                                        <th class="py-2 pr-2 font-medium">Language</th>
                                        <th class="py-2 px-2 font-medium text-right">
                                            Daily Words
                                        </th>
                                        <th class="py-2 px-2 font-medium text-right">
                                            Total Words
                                        </th>
                                        <th
                                            v-if="stats.global_plays > 0"
                                            class="py-2 px-2 font-medium text-right"
                                        >
                                            Plays
                                        </th>
                                        <th
                                            v-if="stats.global_plays > 0"
                                            class="py-2 pl-2 font-medium text-right"
                                        >
                                            Win %
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-neutral-100 dark:divide-neutral-700/50"
                                >
                                    <tr
                                        v-for="lang in stats.lang_stats"
                                        :key="lang.code"
                                        class="hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                                    >
                                        <td class="py-1.5 pr-2">
                                            <NuxtLink
                                                :to="`/${lang.code}/words`"
                                                class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                            >
                                                {{ lang.name }}
                                            </NuxtLink>
                                            <span
                                                v-if="
                                                    lang.name_native &&
                                                    lang.name_native !== lang.name
                                                "
                                                class="text-neutral-400 dark:text-neutral-500 ml-1"
                                            >
                                                {{ lang.name_native }}
                                            </span>
                                            <span
                                                v-if="lang.has_schedule"
                                                class="ml-1 text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1 rounded"
                                            >
                                                curated
                                            </span>
                                        </td>
                                        <td
                                            :class="[
                                                'py-1.5 px-2 text-right tabular-nums',
                                                dailyCountClass(lang.n_daily),
                                            ]"
                                        >
                                            <template v-if="lang.n_daily > 0">
                                                {{ lang.n_daily.toLocaleString() }}
                                            </template>
                                            <template v-else>&mdash;</template>
                                        </td>
                                        <td
                                            class="py-1.5 px-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400"
                                        >
                                            {{
                                                (lang.n_words + lang.n_supplement).toLocaleString()
                                            }}
                                        </td>
                                        <td
                                            v-if="stats.global_plays > 0"
                                            class="py-1.5 px-2 text-right tabular-nums text-neutral-400 dark:text-neutral-500"
                                        >
                                            <template v-if="lang.total_plays > 0">
                                                {{ lang.total_plays.toLocaleString() }}
                                            </template>
                                            <template v-else>&mdash;</template>
                                        </td>
                                        <td
                                            v-if="stats.global_plays > 0"
                                            :class="[
                                                'py-1.5 pl-2 text-right tabular-nums',
                                                winRateClass(lang.win_rate),
                                            ]"
                                        >
                                            <template v-if="lang.win_rate !== null">
                                                {{ lang.win_rate }}%
                                            </template>
                                            <template v-else>&mdash;</template>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div
                            class="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500 space-y-0.5"
                        >
                            <p>
                                <strong>Daily Words</strong> = curated daily word pool.
                                <strong>Total Words</strong> = all valid 5-letter words (including
                                guesses). Color:
                                <span class="text-green-600 dark:text-green-400">green</span> =
                                2,000+,
                                <span class="text-yellow-600 dark:text-yellow-400">yellow</span> =
                                1,000+, <span class="text-orange-500">orange</span> = &lt;1,000,
                                <span class="text-neutral-400">&mdash;</span> = not yet curated.
                            </p>
                        </div>
                    </div>
                </template>
            </div>

            <!-- CTA -->
            <div class="text-center mb-4">
                <NuxtLink
                    to="/"
                    class="inline-block py-2.5 px-6 text-white font-semibold rounded-lg shadow-md bg-green-500 hover:bg-green-600 transition-colors"
                >
                    Play Wordle
                </NuxtLink>
            </div>

            <p class="text-center text-xs text-neutral-400">
                <a
                    href="https://github.com/Hugo0/wordle"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hover:underline"
                >
                    Open source on GitHub
                </a>
            </p>
        </div>
    </div>
</template>
