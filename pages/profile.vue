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
import { BarChart2, Flame, Square, Zap, ChevronRight } from 'lucide-vue-next';
import { isClassicDailyStatsKey, GAME_MODE_CONFIG, GAME_MODE_ORDER } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import type { SpeedAggregate } from '~/utils/types';
import { createEmptyDistribution } from '~/utils/types';

import { useFlag } from '~/composables/useFlag';
import type { GameResult } from '~/utils/types';

useSeoMeta({
    title: 'Your Profile — Wordle Global',
    description: 'Your Wordle profile, badges, and statistics across all languages and game modes.',
    ogTitle: 'Your Profile — Wordle Global',
    ogUrl: 'https://wordle.global/profile',
    ogType: 'website',
    twitterCard: 'summary',
});

useHead({
    htmlAttrs: { lang: 'en' },
    link: [{ rel: 'canonical', href: 'https://wordle.global/profile' }],
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

// Mode icons come from GAME_MODES_UI — no duplication
const getModeIcon = (mode: string) => GAME_MODES_UI.find((m) => m.id === mode)?.icon || Square;

// =========================================================================
// State — derived from the stats store (single source of truth)
// =========================================================================

const statsStore = useStatsStore();
const loaded = ref(false);
const empty = ref(false);

// Auth & profile
const { loggedIn: authLoggedIn, user: authUser, logout: authLogout, refreshSession } = useAuth();

// Name editing
const editingName = ref(false);
const editName = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

function startEditName() {
    editName.value = authUser.value?.displayName ?? '';
    editingName.value = true;
    nextTick(() => nameInputRef.value?.focus());
}

async function saveName() {
    const name = editName.value.trim();
    if (!name || name === authUser.value?.displayName) {
        editingName.value = false;
        return;
    }
    try {
        await $fetch('/api/user/profile', { method: 'PUT', body: { displayName: name } });
        await refreshSession();
        editingName.value = false;
    } catch {
        // Keep editing open on failure
    }
}

const { openLoginModal } = useLoginModal();

interface ProfileBadge {
    slug: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    group?: string | null;
    threshold?: number;
    earnedAt?: string;
}

interface ProfileData {
    createdAt: string;
    badges: ProfileBadge[];
    isPro: boolean;
}

const profileData = ref<ProfileData | null>(null);
const allBadges = ref<ProfileBadge[]>([]);
const badgeProgress = ref<Record<string, number>>({});
const earnedSlugs = computed(() => {
    const set = new Set<string>();
    if (profileData.value) {
        for (const b of profileData.value.badges) set.add(b.slug);
    }
    return set;
});

// Badges: sorted (earned first), collapsible
const BADGE_INITIAL_COUNT = 8;
const badgesExpanded = ref(false);
const sortedBadges = computed(() => {
    const earned = allBadges.value.filter((b) => earnedSlugs.value.has(b.slug));
    const locked = allBadges.value.filter((b) => !earnedSlugs.value.has(b.slug));
    return [...earned, ...locked];
});
const visibleBadges = computed(() => {
    if (badgesExpanded.value) return sortedBadges.value;
    return sortedBadges.value.slice(0, BADGE_INITIAL_COUNT);
});
const hasMoreBadges = computed(() => sortedBadges.value.length > BADGE_INITIAL_COUNT);

// Fetch profile + all badge definitions when logged in
if (import.meta.client) {
    watch(
        authLoggedIn,
        async (isLoggedIn) => {
            if (!isLoggedIn) return;
            try {
                const [profile, badges] = await Promise.all([
                    $fetch('/api/user/profile'),
                    $fetch('/api/badges'),
                ]);
                profileData.value = profile as ProfileData;

                // Merge earnedAt from profile into badge definitions
                const earnedMap = new Map<string, string>();
                for (const b of (profile as ProfileData).badges) {
                    if (b.earnedAt) earnedMap.set(b.slug, b.earnedAt);
                }
                allBadges.value = ((badges as ProfileBadge[]) ?? []).map((b) => ({
                    ...b,
                    earnedAt: earnedMap.get(b.slug),
                }));

                // Progress is non-critical — fetch separately so it doesn't block badges
                try {
                    const progress = await $fetch('/api/user/badge-progress');
                    badgeProgress.value = (progress as Record<string, number>) ?? {};
                } catch {
                    // Progress bars won't show, but badges still render
                }
            } catch {
                // Non-critical — badges won't show but page still works
            }

            // Scroll to hash target after async content renders (e.g. #badges).
            // Double nextTick: first flushes Vue reactivity, second waits for DOM update.
            const hash = useRoute().hash;
            if (hash) {
                await nextTick();
                await nextTick();
                document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
            }
        },
        { immediate: true }
    );
}

function formatDate(dateStr: string): string {
    try {
        return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
            new Date(dateStr)
        );
    } catch {
        return '';
    }
}

import { LogOut, Pencil } from 'lucide-vue-next';

// Product-wide streak — single source via composable
const { streak: productStreakRaw, bestStreak: productBestStreakRaw } = useProductStreak();
const productStreak = computed(() => productStreakRaw.value);
const productBestStreak = computed(() => productBestStreakRaw.value);
const animProductStreak = useAnimatedNumber(productStreak);
const streakExpanded = ref(false);

// Calendar heatmap uses SharedStreakCalendar component (DRY with StreakModal)

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

// Tab state for the stats section
type StatsTab = 'overview' | 'distribution' | 'languages' | 'speed';
const activeTab = ref<StatsTab>('overview');
const availableTabs = computed<{ id: StatsTab; label: string }[]>(() => {
    const tabs: { id: StatsTab; label: string }[] = [{ id: 'overview', label: 'Overview' }];
    // Show distribution if we have any classic/multiboard games
    if (Object.values(overallDist.value).some((v) => v > 0)) {
        tabs.push({ id: 'distribution', label: 'Distribution' });
    }
    if (perLang.value.length > 0) {
        tabs.push({ id: 'languages', label: `Languages (${perLang.value.length})` });
    }
    if (speedAggregate.value && speedAggregate.value.games > 0) {
        tabs.push({ id: 'speed', label: 'Speed' });
    }
    return tabs;
});

const sortedModes = computed(() => {
    const classic = modeStats.value.filter((m) => m.mode === 'classic');
    const rest = modeStats.value
        .filter((m) => m.mode !== 'classic')
        .sort((a, b) => b.games - a.games);
    return [...classic, ...rest];
});

// Distribution mode picker — which mode's histogram to show
const distMode = ref<GameMode | null>(null);
const activeDistMode = computed(() => {
    if (distMode.value) return modeStats.value.find((m) => m.mode === distMode.value) || null;
    // Default: first mode with wins
    return sortedModes.value.find((m) => Object.values(m.distribution).some((v) => v > 0)) || null;
});
const activeDistLabel = computed(() => activeDistMode.value?.label || 'Classic');
const activeDistData = computed(() => activeDistMode.value?.distribution || overallDist.value);
const activeDistMax = computed(() => activeDistMode.value?.maxGuesses || 6);
// Modes that have distribution data (at least 1 win)
const modesWithDist = computed(() =>
    sortedModes.value.filter((m) => Object.values(m.distribution).some((v) => v > 0))
);

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

    // Product-wide streak now comes from useProductStreak() composable — no manual computation needed.

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
            icon: getModeIcon(gm),
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
</script>

<template>
    <AppShell lang="en" lang-name="English" home-href="/">
        <div class="max-w-[560px] mx-auto px-4 pt-6 pb-12">
            <!-- Header -->
            <header class="mb-10">
                <h1 class="heading-display text-[32px] sm:text-[40px] text-ink">Profile</h1>
                <div class="editorial-rule-accent w-[60px] mt-3" />
            </header>

            <!-- Profile section -->
            <section v-if="authLoggedIn" class="mb-10">
                <div class="flex items-center gap-4">
                    <img
                        v-if="authUser?.avatarUrl"
                        :src="authUser.avatarUrl"
                        alt=""
                        class="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        referrerpolicy="no-referrer"
                    />
                    <div
                        v-else
                        class="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center text-xl font-display font-bold flex-shrink-0"
                    >
                        {{ (authUser?.displayName ?? 'P')[0] }}
                    </div>
                    <div class="flex-1 min-w-0">
                        <!-- Editable display name -->
                        <div v-if="editingName" class="flex items-center gap-2">
                            <input
                                ref="nameInputRef"
                                v-model="editName"
                                type="text"
                                maxlength="50"
                                class="heading-section text-xl text-ink bg-transparent border-b border-ink focus:outline-none w-full"
                                @keydown.enter="saveName()"
                                @keydown.escape="editingName = false"
                            />
                            <button
                                class="text-sm text-correct hover:underline flex-shrink-0"
                                @click="saveName()"
                            >
                                Save
                            </button>
                            <button
                                class="text-sm text-muted hover:underline flex-shrink-0"
                                @click="editingName = false"
                            >
                                Cancel
                            </button>
                        </div>
                        <h2
                            v-else
                            class="heading-section text-xl text-ink cursor-pointer hover:opacity-70 transition-opacity"
                            title="Click to edit name"
                            @click="startEditName()"
                        >
                            {{ authUser?.displayName ?? 'Player' }}
                            <Pencil :size="12" class="inline text-muted ml-1" />
                        </h2>
                        <div v-if="authUser?.email" class="mono-label">{{ authUser.email }}</div>
                        <div v-if="profileData?.createdAt" class="mono-label mt-0.5">
                            Member since {{ formatDate(profileData.createdAt) }}
                        </div>
                    </div>
                </div>

                <!-- Account actions -->
                <div class="mt-6 flex items-center gap-4">
                    <button
                        class="text-sm text-muted hover:text-ink transition-colors flex items-center gap-1"
                        @click="authLogout()"
                    >
                        <LogOut :size="14" />
                        Sign out
                    </button>
                </div>
            </section>

            <!-- Sign-in CTA (logged out) — reuses the login modal -->
            <section
                v-if="!authLoggedIn && !empty"
                class="mb-10 border border-rule p-5 text-center"
            >
                <h2 class="heading-body text-lg text-ink mb-2">Save your progress</h2>
                <p class="text-sm text-muted mb-4">
                    Sign in to sync stats across devices, earn badges, and protect your streak.
                </p>
                <button
                    class="px-6 py-2 bg-ink text-paper text-sm font-semibold hover:opacity-90 transition-opacity"
                    @click="openLoginModal()"
                >
                    Sign in
                </button>
            </section>

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
                <!-- ═══ Product-Wide Streak Hero (clickable → calendar) ═══ -->
                <section
                    class="mb-10 text-center border border-rule cursor-pointer transition-colors hover:bg-paper-warm"
                    style="padding: 28px 16px 24px"
                    @click="streakExpanded = !streakExpanded"
                >
                    <Flame
                        :size="36"
                        :class="productStreak > 0 ? 'text-flame' : 'text-muted'"
                        class="mx-auto mb-1"
                    />
                    <div
                        class="font-display font-bold"
                        :class="productStreak > 0 ? 'text-flame' : 'text-ink'"
                        style="font-size: 48px; font-variation-settings: 'opsz' 144; line-height: 1"
                    >
                        {{ Math.round(animProductStreak) }}
                    </div>
                    <div class="mono-label mt-1">Day Streak</div>
                    <div
                        class="text-xs text-muted italic mt-1.5"
                        style="font-family: var(--font-display)"
                    >
                        Any daily mode, any language
                    </div>

                    <!-- Calendar heatmap (expands on click) -->
                    <div
                        v-if="streakExpanded"
                        class="mt-5 pt-4 border-t border-rule text-left"
                        @click.stop
                    >
                        <SharedStreakCalendar
                            :game-results="statsStore.gameResults as Record<string, GameResult[]>"
                        />
                        <!-- Current / Longest row -->
                        <div class="grid grid-cols-2 gap-px bg-rule mt-3">
                            <div class="bg-paper text-center py-3">
                                <div
                                    class="font-display font-bold text-ink"
                                    style="font-size: 22px; font-variation-settings: 'opsz' 72"
                                >
                                    {{ productStreak }}
                                </div>
                                <div class="mono-label mt-0.5">Current</div>
                            </div>
                            <div class="bg-paper text-center py-3">
                                <div
                                    class="font-display font-bold text-ink"
                                    style="font-size: 22px; font-variation-settings: 'opsz' 72"
                                >
                                    {{ productBestStreak }}
                                </div>
                                <div class="mono-label mt-0.5">Longest</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Tabbed Stats Section ═══ -->
                <section id="statistics" class="mb-10 scroll-mt-16">
                    <!-- Tab bar -->
                    <div
                        v-if="availableTabs.length > 1"
                        class="flex gap-0 border-b border-rule mb-4"
                    >
                        <button
                            v-for="tab in availableTabs"
                            :key="tab.id"
                            class="mono-label px-3 py-2 transition-colors border-b-2 -mb-px"
                            :class="
                                activeTab === tab.id
                                    ? 'border-ink text-ink'
                                    : 'border-transparent text-muted hover:text-ink'
                            "
                            @click="activeTab = tab.id"
                        >
                            {{ tab.label }}
                        </button>
                    </div>
                    <div v-else class="mono-label mb-4">Overview</div>

                    <!-- Tab: Overview — summary row + per-mode breakdown -->
                    <div v-show="activeTab === 'overview'">
                        <!-- Summary row -->
                        <div
                            class="grid grid-cols-4 border border-rule"
                            style="background: var(--color-rule); gap: 1px"
                        >
                            <div class="bg-paper text-center" style="padding: 16px 8px">
                                <div
                                    class="font-display font-bold text-ink"
                                    style="
                                        font-size: 24px;
                                        font-variation-settings: 'opsz' 72;
                                        line-height: 1;
                                    "
                                >
                                    {{ allModesGames }}
                                </div>
                                <div class="mono-label mt-1">Played</div>
                            </div>
                            <div class="bg-paper text-center" style="padding: 16px 8px">
                                <div
                                    class="font-display font-bold"
                                    :class="
                                        allModesWinRate !== null && allModesWinRate >= 50
                                            ? 'text-correct'
                                            : 'text-ink'
                                    "
                                    style="
                                        font-size: 24px;
                                        font-variation-settings: 'opsz' 72;
                                        line-height: 1;
                                    "
                                >
                                    {{ allModesWinRate === null ? '—' : `${allModesWinRate}%` }}
                                </div>
                                <div class="mono-label mt-1">Win Rate</div>
                            </div>
                            <div class="bg-paper text-center" style="padding: 16px 8px">
                                <div
                                    class="font-display font-bold text-ink"
                                    style="
                                        font-size: 24px;
                                        font-variation-settings: 'opsz' 72;
                                        line-height: 1;
                                    "
                                >
                                    {{ modesPlayed }}
                                </div>
                                <div class="mono-label mt-1">Modes</div>
                            </div>
                            <div class="bg-paper text-center" style="padding: 16px 8px">
                                <div
                                    class="font-display font-bold text-ink"
                                    style="
                                        font-size: 24px;
                                        font-variation-settings: 'opsz' 72;
                                        line-height: 1;
                                    "
                                >
                                    {{ languagesConquered }}
                                </div>
                                <div class="mono-label mt-1">Languages</div>
                            </div>
                        </div>
                        <!-- Per-mode breakdown -->
                        <div
                            v-if="sortedModes.length > 0"
                            class="border border-t-0 border-rule divide-y divide-rule"
                        >
                            <div
                                v-for="m in sortedModes"
                                :key="m.mode"
                                class="flex items-center gap-3"
                                style="padding: 10px 16px"
                            >
                                <component :is="m.icon" :size="16" class="text-ink flex-shrink-0" />
                                <span class="text-sm font-medium text-ink flex-1">{{
                                    m.label
                                }}</span>
                                <span class="text-xs text-muted tabular-nums">{{ m.games }}</span>
                                <span
                                    class="text-xs tabular-nums w-10 text-right"
                                    :class="m.winPct >= 50 ? 'text-correct' : 'text-muted'"
                                    >{{ m.winPct }}%</span
                                >
                            </div>
                            <div
                                v-if="speedAggregate && speedAggregate.games > 0"
                                class="flex items-center gap-3"
                                style="padding: 10px 16px"
                            >
                                <Zap :size="16" class="text-ink flex-shrink-0" />
                                <span class="text-sm font-medium text-ink flex-1"
                                    >Speed Streak</span
                                >
                                <span class="text-xs text-muted tabular-nums">{{
                                    speedAggregate.games
                                }}</span>
                                <span class="text-xs text-muted w-10 text-right">—</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Distribution — per-mode histogram with mode picker -->
                    <div v-show="activeTab === 'distribution'">
                        <!-- Mode picker pills (only if >1 mode has distribution data) -->
                        <div v-if="modesWithDist.length > 1" class="flex gap-1 mb-3 flex-wrap">
                            <button
                                v-for="m in modesWithDist"
                                :key="m.mode"
                                class="flex items-center gap-1 px-2.5 py-1 text-xs border transition-colors"
                                :class="
                                    (distMode || activeDistMode?.mode) === m.mode
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-rule text-muted hover:text-ink'
                                "
                                @click="distMode = m.mode"
                            >
                                <component :is="m.icon" :size="12" />
                                {{ m.label }}
                            </button>
                        </div>
                        <!-- Histogram -->
                        <div class="border border-rule" style="padding: 16px">
                            <div class="space-y-1.5">
                                <div
                                    v-for="n in activeDistMax"
                                    :key="n"
                                    class="flex items-center gap-2"
                                >
                                    <span
                                        class="font-mono font-semibold text-xs w-4 text-right text-muted"
                                        >{{ n }}</span
                                    >
                                    <div
                                        class="h-6 flex items-center justify-end px-2 font-mono text-[10px] font-semibold text-white transition-all duration-500"
                                        style="min-width: 24px"
                                        :class="
                                            (activeDistData[n] || 0) > 0
                                                ? 'bg-ink'
                                                : 'bg-muted-soft'
                                        "
                                        :style="{ width: distBarWidth(activeDistData, n) }"
                                    >
                                        <span v-if="(activeDistData[n] || 0) > 0">{{
                                            activeDistData[n]
                                        }}</span>
                                    </div>
                                </div>
                            </div>
                            <p class="text-xs text-muted mt-3 text-center">
                                {{ activeDistLabel }} · guess distribution
                            </p>
                        </div>
                    </div>

                    <!-- Tab: Languages -->
                    <div v-show="activeTab === 'languages'">
                        <div class="border border-rule divide-y divide-rule">
                            <NuxtLink
                                v-for="l in perLang"
                                :key="l.code"
                                :to="`/${l.code}`"
                                class="flex items-center gap-3 hover:bg-paper-warm transition-colors"
                                style="padding: 10px 16px"
                            >
                                <img
                                    v-if="useFlag(l.code)"
                                    :src="useFlag(l.code)!"
                                    :alt="l.name"
                                    class="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                />
                                <div class="flex-1 min-w-0">
                                    <span class="text-sm font-medium text-ink">{{
                                        l.nameNative || l.name
                                    }}</span>
                                </div>
                                <span class="text-xs text-muted tabular-nums">{{ l.games }}</span>
                                <span
                                    class="text-xs tabular-nums"
                                    :class="l.winPct >= 50 ? 'text-correct' : 'text-muted'"
                                    >{{ l.winPct }}%</span
                                >
                                <ChevronRight :size="14" class="text-muted flex-shrink-0" />
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- Tab: Speed -->
                    <div v-if="speedAggregate" v-show="activeTab === 'speed'">
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
                                    >{{ i + 1 }}</span
                                >
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-semibold text-ink tabular-nums">
                                        {{ run.score.toLocaleString() }} pts
                                    </div>
                                    <div class="text-xs text-muted tabular-nums">
                                        {{ run.wordsSolved }} solved · {{ run.maxCombo }}x combo
                                    </div>
                                </div>
                                <span class="mono-label">{{
                                    new Date(run.date).toLocaleDateString()
                                }}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Badges (collapsed by default, earned first) ═══ -->
                <section
                    v-if="allBadges.length > 0 && authLoggedIn"
                    id="badges"
                    class="mb-10 scroll-mt-16"
                >
                    <div
                        class="font-display text-xl font-bold text-ink mb-1"
                        style="font-variation-settings: 'opsz' 48"
                    >
                        Achievement Badges
                    </div>
                    <div class="text-xs text-muted mb-4">
                        {{ earnedSlugs.size }} of {{ allBadges.length }} earned
                    </div>
                    <AccountBadgeGrid
                        :badges="allBadges"
                        :earned-slugs="earnedSlugs"
                        :progress="badgeProgress"
                    />
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
