<script setup lang="ts">
/**
 * Stats — /stats
 *
 * Personal stats dashboard showing the user's play history across all game modes.
 * Uses the editorial design system (Fraunces + Source Sans 3 + design tokens).
 * All data comes from localStorage game_results — no server data.
 */
import { readJson } from '~/utils/storage';
import { useAnimatedNumber } from '~/composables/useAnimatedNumber';
import {
    BarChart2,
    Flame,
    Trophy,
    Target,
    Square,
    Infinity,
    Zap,
    Columns2,
    Columns3,
    Grid2x2,
    ChevronRight,
} from 'lucide-vue-next';
import { isClassicDailyStatsKey, GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import type { SpeedAggregate } from '~/utils/types';
import { createEmptyDistribution } from '~/utils/types';

useSeoMeta({
    title: 'Your Stats — Wordle Global',
    description: 'Your personal Wordle statistics across all languages and game modes.',
    ogTitle: 'Your Stats — Wordle Global',
    ogUrl: 'https://wordle.global/stats',
    ogType: 'website',
    twitterCard: 'summary',
});

useHead({
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'canonical', href: 'https://wordle.global/stats' }],
});

// =========================================================================
// Types
// =========================================================================

interface PerLangStats {
    code: string;
    name: string;
    nameNative: string;
    games: number;
    wins: number;
    winPct: number;
    avgAttempts: string;
    streak: number;
    best: number;
}

interface ModeStats {
    mode: GameMode;
    label: string;
    icon: typeof Square;
    games: number;
    wins: number;
    winPct: number;
    avgAttempts: string;
    streak: number;
    bestStreak: number;
    distribution: Record<number, number>;
    maxGuesses: number;
}

const MODE_ICONS: Record<string, typeof Square> = {
    classic: Square,
    unlimited: Infinity,
    speed: Zap,
    dordle: Columns2,
    tridle: Columns3,
    quordle: Grid2x2,
};

// =========================================================================
// State — derived from the stats store (single source of truth)
// =========================================================================

const statsStore = useStatsStore();
const loaded = ref(false);
const empty = ref(false);

// Classic daily (from store's calculateTotalStats)
const totalGames = ref(0);
const overallWinRate = ref(0);
const currentStreak = ref(0);
const bestStreak = ref(0);

// Animated display values (count up from 0)
const animGames = useAnimatedNumber(totalGames);
const animWinRate = useAnimatedNumber(overallWinRate);
const animStreak = useAnimatedNumber(currentStreak);
const animBest = useAnimatedNumber(bestStreak);
const overallDist = ref<Record<number, number>>(createEmptyDistribution(6));

// Per-language (classic daily)
const perLang = ref<PerLangStats[]>([]);

// Per-mode (all modes that have results)
const modeStats = ref<ModeStats[]>([]);

const speedAggregate = ref<SpeedAggregate | null>(null);

// =========================================================================
// Data loading — uses the stats store instead of reimplementing calculations
// =========================================================================

function loadStats() {
    if (loaded.value) return;
    loaded.value = true;

    statsStore.loadGameResults();
    statsStore.loadSpeedResults();

    const speed = statsStore.calculateSpeedStats();
    speedAggregate.value = speed.games > 0 ? speed : null;

    // loadGameResults seeds an empty placeholder under "unknown", so check
    // values not keys.
    const allKeys = Object.keys(statsStore.gameResults);
    const hasStoredResults = allKeys.some((k) => statsStore.gameResults[k]!.length > 0);
    if (!hasStoredResults && !speedAggregate.value) {
        empty.value = true;
        return;
    }

    // --- Classic daily stats (use store's calculateTotalStats) ---
    const total = statsStore.calculateTotalStats();

    totalGames.value = total.total_games;
    overallWinRate.value = total.total_games > 0 ? Math.round(total.total_win_percentage) : 0;
    currentStreak.value = total.current_overall_streak;
    bestStreak.value = total.longest_overall_streak;

    // Build overall distribution from per-language stats
    const dist = createEmptyDistribution(6);
    for (const langStats of Object.values(total.game_stats)) {
        for (let n = 1; n <= 6; n++) {
            dist[n] = (dist[n] || 0) + (langStats.guessDistribution[n] || 0);
        }
    }
    overallDist.value = dist;

    // Language name cache (populated by homepage)
    const langCache: Record<string, { language_name?: string; language_name_native?: string }> =
        readJson('languages_cache') ?? {};

    // Per-language breakdown (use store's per-key stats)
    const classicKeys = allKeys.filter(isClassicDailyStatsKey);
    const langs: PerLangStats[] = [];
    for (const lc of classicKeys) {
        const langStats = total.game_stats[lc];
        if (!langStats || langStats.n_games === 0) continue;

        langs.push({
            code: lc,
            name: langCache[lc]?.language_name || lc,
            nameNative: langCache[lc]?.language_name_native || '',
            games: langStats.n_games,
            wins: langStats.n_wins,
            winPct: Math.round(langStats.win_percentage),
            avgAttempts: langStats.n_wins > 0 ? langStats.avg_attempts.toFixed(1) : '-',
            streak: langStats.current_streak,
            best: langStats.longest_streak,
        });
    }
    langs.sort((a, b) => b.games - a.games);
    perLang.value = langs;

    // --- Per-mode stats (aggregate results by mode) ---
    const modeMap: Record<string, { mode: GameMode; keys: string[] }> = {};
    for (const key of allKeys) {
        let mode: GameMode;
        if (isClassicDailyStatsKey(key)) {
            mode = 'classic';
        } else {
            const parts = key.split('_');
            const modePart = parts[1] as GameMode;
            if (!GAME_MODE_CONFIG[modePart]) continue;
            mode = modePart;
        }
        if (!modeMap[mode]) modeMap[mode] = { mode, keys: [] };
        modeMap[mode]!.keys.push(key);
    }

    const modes: ModeStats[] = [];
    for (const [mode, data] of Object.entries(modeMap)) {
        const gm = mode as GameMode;
        const def = GAME_MODE_CONFIG[gm];
        if (!def) continue;

        // Calculate stats per mode by aggregating all keys for that mode
        let totalWins = 0;
        let totalLosses = 0;
        let totalAttempts = 0;
        let modeStreak = 0;
        let modeBestStreak = 0;
        const modeDist = createEmptyDistribution(def.maxGuesses);

        for (const key of data.keys) {
            const results = statsStore.gameResults[key] || [];
            for (const r of results) {
                const att = parseInt(String(r.attempts), 10);
                if (r.won) {
                    totalWins++;
                    modeStreak++;
                    if (modeStreak > modeBestStreak) modeBestStreak = modeStreak;
                    if (att >= 1 && att <= def.maxGuesses) {
                        modeDist[att] = (modeDist[att] || 0) + 1;
                        totalAttempts += att;
                    }
                } else {
                    totalLosses++;
                    modeStreak = 0;
                }
            }
        }

        const games = totalWins + totalLosses;
        if (games === 0) continue;

        modes.push({
            mode: gm,
            label: def.label,
            icon: MODE_ICONS[gm] || Square,
            games,
            wins: totalWins,
            winPct: Math.round((totalWins / games) * 100),
            avgAttempts: totalWins > 0 ? (totalAttempts / totalWins).toFixed(1) : '-',
            streak: modeStreak,
            bestStreak: modeBestStreak,
            distribution: modeDist,
            maxGuesses: def.maxGuesses,
        });
    }
    modes.sort((a, b) => b.games - a.games);
    modeStats.value = modes;
}

onMounted(() => loadStats());

// =========================================================================
// Helpers
// =========================================================================

function distBarWidth(dist: Record<number, number>, n: number): string {
    const count = dist[n] || 0;
    const max = Math.max(...Object.values(dist), 1);
    const pct = count > 0 ? Math.max((count / max) * 100, 8) : 0;
    return `${pct}%`;
}

// All-modes aggregated stats.
// Speed sessions count toward total games / modes played but are excluded from
// win rate (speed has no win/loss — it's a high-score format).
const speedGames = computed(() => speedAggregate.value?.games ?? 0);
const allModesGames = computed(
    () => modeStats.value.reduce((sum, m) => sum + m.games, 0) + speedGames.value
);
const allModesWins = computed(() => modeStats.value.reduce((sum, m) => sum + m.wins, 0));
const winRateDenominator = computed(() => modeStats.value.reduce((sum, m) => sum + m.games, 0));
// null when there's nothing to compute a win rate from (e.g. speed-only
// players) — the template renders "—" instead of a misleading 0%.
const allModesWinRate = computed<number | null>(() =>
    winRateDenominator.value > 0
        ? Math.round((allModesWins.value / winRateDenominator.value) * 100)
        : null
);
const modesPlayed = computed(() => {
    const withResults = modeStats.value.filter((m) => m.games > 0).length;
    return withResults + (speedGames.value > 0 ? 1 : 0);
});

// Languages conquered: unique languages across classic daily wins AND
// speed sessions where the player actually solved ≥1 word.
const languagesConquered = computed(() => {
    const langs = new Set<string>(statsStore.totalStats.languages_won || []);
    if (speedAggregate.value) {
        for (const [code, info] of Object.entries(speedAggregate.value.perLang)) {
            if (info.bestScore > 0) langs.add(code);
        }
    }
    return langs.size;
});

const modeOrder: GameMode[] = [
    'classic',
    'dordle',
    'quordle',
    'octordle',
    'sedecordle',
    'duotrigordle',
    'unlimited',
    'speed',
];
const sortedModes = computed(() =>
    [...modeStats.value].sort((a, b) => modeOrder.indexOf(a.mode) - modeOrder.indexOf(b.mode))
);
</script>

<template>
    <AppShell lang="en" lang-name="English" home-href="/">
        <div class="max-w-[560px] mx-auto px-4 pt-6 pb-12">
            <!-- Header -->
            <header class="mb-10">
                <h1 class="heading-display text-[32px] sm:text-[40px] text-ink">Your Stats</h1>
                <div class="editorial-rule-accent w-[60px] mt-3" />
            </header>

            <!-- Empty state -->
            <div v-if="empty" class="text-center py-16">
                <BarChart2 :size="40" class="text-muted mx-auto mb-4" />
                <p class="text-muted mb-6">No games played yet.</p>
                <NuxtLink
                    to="/"
                    class="inline-block py-3 px-8 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
                >
                    Start Playing
                </NuxtLink>
            </div>

            <template v-else-if="loaded">
                <!-- ═══ Overview (all modes combined) ═══ -->
                <section class="mb-10">
                    <div class="mono-label mb-4">Overview</div>

                    <!-- Hero stats row -->
                    <div
                        class="grid grid-cols-4 border border-rule"
                        style="background: var(--color-rule); gap: 1px"
                    >
                        <div class="bg-paper text-center" style="padding: 20px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="
                                    font-size: 28px;
                                    font-variation-settings: 'opsz' 72;
                                    line-height: 1;
                                "
                            >
                                {{ allModesGames }}
                            </div>
                            <div class="mono-label mt-1.5">Played</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 20px 8px">
                            <div
                                class="font-display font-bold"
                                :class="
                                    allModesWinRate !== null && allModesWinRate >= 50
                                        ? 'text-correct'
                                        : 'text-ink'
                                "
                                style="
                                    font-size: 28px;
                                    font-variation-settings: 'opsz' 72;
                                    line-height: 1;
                                "
                            >
                                {{ allModesWinRate === null ? '—' : `${allModesWinRate}%` }}
                            </div>
                            <div class="mono-label mt-1.5">Win Rate</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 20px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="
                                    font-size: 28px;
                                    font-variation-settings: 'opsz' 72;
                                    line-height: 1;
                                "
                            >
                                {{ modesPlayed }}
                            </div>
                            <div class="mono-label mt-1.5">Modes</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 20px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="
                                    font-size: 28px;
                                    font-variation-settings: 'opsz' 72;
                                    line-height: 1;
                                "
                            >
                                {{ languagesConquered }}
                            </div>
                            <div class="mono-label mt-1.5">Conquered</div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Daily Classic ═══ -->
                <section v-if="totalGames > 0" class="mb-10">
                    <div class="mono-label mb-4">
                        <Square :size="12" class="inline -mt-0.5 mr-1" />
                        Daily Classic
                    </div>

                    <!-- Streak strip -->
                    <div
                        class="flex border border-rule"
                        style="background: var(--color-rule); gap: 1px"
                    >
                        <div class="flex-1 bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ Math.round(animGames) }}
                            </div>
                            <div class="mono-label mt-0.5">Played</div>
                        </div>
                        <div class="flex-1 bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold"
                                :class="overallWinRate >= 50 ? 'text-correct' : 'text-ink'"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ Math.round(animWinRate) }}%
                            </div>
                            <div class="mono-label mt-0.5">Win</div>
                        </div>
                        <div
                            class="flex-1 bg-paper flex items-center justify-center gap-1.5"
                            style="padding: 14px 8px"
                        >
                            <Flame
                                :size="14"
                                :class="currentStreak > 0 ? 'text-flame' : 'text-muted'"
                            />
                            <span
                                class="font-display font-bold text-[22px]"
                                style="font-variation-settings: 'opsz' 72"
                                >{{ Math.round(animStreak) }}</span
                            >
                            <span class="mono-label">Streak</span>
                        </div>
                        <div
                            class="flex-1 bg-paper flex items-center justify-center gap-1.5"
                            style="padding: 14px 8px"
                        >
                            <Trophy :size="14" class="text-muted" />
                            <span
                                class="font-display font-bold text-[22px]"
                                style="font-variation-settings: 'opsz' 72"
                                >{{ Math.round(animBest) }}</span
                            >
                            <span class="mono-label">Best</span>
                        </div>
                    </div>

                    <!-- Distribution -->
                    <div class="border border-t-0 border-rule" style="padding: 14px 16px">
                        <div class="space-y-1">
                            <div v-for="n in 6" :key="n" class="flex items-center gap-2">
                                <span
                                    class="font-mono font-semibold text-[12px] w-3 text-right text-muted"
                                >
                                    {{ n }}
                                </span>
                                <div
                                    class="h-[20px] flex items-center justify-end px-2 font-mono text-[10px] font-semibold text-white transition-all"
                                    style="min-width: 20px"
                                    :class="overallDist[n] > 0 ? 'bg-ink' : 'bg-muted-soft'"
                                    :style="{ width: distBarWidth(overallDist, n) }"
                                >
                                    <span v-if="overallDist[n] > 0">{{ overallDist[n] }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Game Modes ═══ -->
                <section
                    v-if="sortedModes.length > 0 && sortedModes.some((m) => m.mode !== 'classic')"
                    class="mb-10"
                >
                    <div class="mono-label mb-4">Game Modes</div>

                    <div class="space-y-3">
                        <div v-for="m in sortedModes" :key="m.mode" class="border border-rule">
                            <!-- Mode header -->
                            <div
                                class="flex items-center gap-3 bg-paper-warm"
                                style="padding: 12px 16px"
                            >
                                <component :is="m.icon" :size="16" class="text-ink" />
                                <span class="heading-section text-[15px]">{{ m.label }}</span>
                                <span class="mono-label ml-auto">{{ m.games }} games</span>
                            </div>
                            <!-- Mode stats row -->
                            <div
                                class="grid grid-cols-4"
                                style="background: var(--color-rule); gap: 1px"
                            >
                                <div class="bg-paper text-center" style="padding: 10px 8px">
                                    <div
                                        class="font-display font-bold text-[18px] text-ink"
                                        style="font-variation-settings: 'opsz' 72"
                                    >
                                        {{ m.winPct }}%
                                    </div>
                                    <div class="mono-label mt-0.5">Win</div>
                                </div>
                                <div class="bg-paper text-center" style="padding: 10px 8px">
                                    <div
                                        class="font-display font-bold text-[18px] text-ink"
                                        style="font-variation-settings: 'opsz' 72"
                                    >
                                        {{ m.avgAttempts }}
                                    </div>
                                    <div class="mono-label mt-0.5">Avg</div>
                                </div>
                                <div class="bg-paper text-center" style="padding: 10px 8px">
                                    <div
                                        class="font-display font-bold text-[18px]"
                                        :class="m.streak > 0 ? 'text-correct' : 'text-ink'"
                                        style="font-variation-settings: 'opsz' 72"
                                    >
                                        {{ m.streak }}
                                    </div>
                                    <div class="mono-label mt-0.5">Streak</div>
                                </div>
                                <div class="bg-paper text-center" style="padding: 10px 8px">
                                    <div
                                        class="font-display font-bold text-[18px] text-ink"
                                        style="font-variation-settings: 'opsz' 72"
                                    >
                                        {{ m.bestStreak }}
                                    </div>
                                    <div class="mono-label mt-0.5">Best</div>
                                </div>
                            </div>
                            <!-- Mini distribution -->
                            <div style="padding: 10px 16px">
                                <div class="flex items-end gap-[2px]" style="height: 28px">
                                    <div
                                        v-for="n in m.maxGuesses"
                                        :key="n"
                                        class="flex-1 rounded-t-sm transition-all"
                                        :class="m.distribution[n] > 0 ? 'bg-ink' : 'bg-muted-soft'"
                                        :style="{
                                            height: distBarWidth(m.distribution, n),
                                            minHeight: m.distribution[n] > 0 ? '4px' : '2px',
                                        }"
                                    />
                                </div>
                                <div class="flex gap-[2px] mt-0.5">
                                    <span
                                        v-for="n in m.maxGuesses"
                                        :key="n"
                                        class="flex-1 text-center font-mono text-[8px] text-muted"
                                    >
                                        {{ n }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Speed Streak ═══ -->
                <section v-if="speedAggregate" class="mb-10">
                    <div class="mono-label mb-4">
                        <Zap :size="12" class="inline -mt-0.5 mr-1" />
                        Speed Streak
                    </div>

                    <!-- Hero row: games, best score, best solved, best combo -->
                    <div
                        class="grid grid-cols-4 border border-rule"
                        style="background: var(--color-rule); gap: 1px"
                    >
                        <div class="bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ speedAggregate.games }}
                            </div>
                            <div class="mono-label mt-0.5">Sessions</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold text-correct"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ speedAggregate.bestScore.toLocaleString() }}
                            </div>
                            <div class="mono-label mt-0.5">Top Score</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ speedAggregate.bestWordsSolved }}
                            </div>
                            <div class="mono-label mt-0.5">Best Solved</div>
                        </div>
                        <div class="bg-paper text-center" style="padding: 14px 8px">
                            <div
                                class="font-display font-bold text-ink"
                                style="font-size: 22px; font-variation-settings: 'opsz' 72"
                            >
                                {{ speedAggregate.bestMaxCombo }}x
                            </div>
                            <div class="mono-label mt-0.5">Best Combo</div>
                        </div>
                    </div>

                    <!-- Top 3 runs -->
                    <div
                        v-if="speedAggregate.topRuns.length > 0"
                        class="border border-t-0 border-rule divide-y divide-rule"
                    >
                        <div
                            v-for="(run, i) in speedAggregate.topRuns"
                            :key="`${run.date}-${i}`"
                            class="flex items-center gap-3"
                            style="padding: 10px 16px"
                        >
                            <span
                                class="w-6 h-6 flex items-center justify-center border border-rule bg-paper-warm font-display font-bold text-xs text-ink flex-shrink-0"
                            >
                                {{ i + 1 }}
                            </span>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-semibold text-ink tabular-nums">
                                    {{ run.score.toLocaleString() }} pts
                                </div>
                                <div class="text-xs text-muted tabular-nums">
                                    {{ run.wordsSolved }} solved · {{ run.maxCombo }}x combo
                                </div>
                            </div>
                            <span class="mono-label">
                                {{ new Date(run.date).toLocaleDateString() }}
                            </span>
                        </div>
                    </div>
                </section>

                <!-- ═══ Languages ═══ -->
                <section v-if="perLang.length > 0" class="mb-10">
                    <div class="mono-label mb-4">Your Languages</div>

                    <div class="border border-rule divide-y divide-rule">
                        <NuxtLink
                            v-for="l in perLang"
                            :key="l.code"
                            :to="`/${l.code}`"
                            class="flex items-center hover:bg-paper-warm transition-colors"
                            style="padding: 12px 16px"
                        >
                            <div class="flex-1 min-w-0">
                                <span class="text-sm font-medium text-ink">{{ l.name }}</span>
                                <span
                                    v-if="l.nameNative && l.nameNative !== l.name"
                                    class="text-xs text-muted ml-1.5"
                                >
                                    {{ l.nameNative }}
                                </span>
                            </div>
                            <div class="flex items-center gap-4 text-xs text-muted shrink-0">
                                <span class="tabular-nums">{{ l.games }}</span>
                                <span class="tabular-nums">{{ l.winPct }}%</span>
                                <span
                                    v-if="l.streak > 0"
                                    class="text-correct font-semibold tabular-nums"
                                >
                                    <Flame :size="11" class="inline -mt-0.5 text-flame" />{{
                                        l.streak
                                    }}
                                </span>
                                <ChevronRight :size="14" class="text-muted" />
                            </div>
                        </NuxtLink>
                    </div>
                </section>

                <!-- CTA -->
                <div class="text-center">
                    <NuxtLink
                        to="/"
                        class="inline-block py-3 px-8 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
                    >
                        Play Wordle
                    </NuxtLink>
                </div>
            </template>
        </div>
    </AppShell>
</template>
