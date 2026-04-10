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
import { buildDailyResultMap, toLocalDay, stepBack } from '~/utils/streak-dates';
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

// Auth & profile
const { loggedIn: authLoggedIn, user: authUser, loginWithGoogle: authLoginWithGoogle, logout: authLogout, refreshSession } = useAuth();

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

// Passkey support detection
const passkeySupported = ref(false);
const passkeyRegistering = ref(false);
const passkeyAdded = ref(false);

if (import.meta.client) {
    onMounted(() => {
        passkeySupported.value = !!window.PublicKeyCredential;
    });
}

// Must be at top level of setup
const { register: registerPasskey } = useWebAuthn({ registerEndpoint: '/api/webauthn/register' });

async function addPasskey() {
    passkeyRegistering.value = true;
    try {
        await registerPasskey({ userName: authUser.value?.displayName || authUser.value?.email || 'user' });
        passkeyAdded.value = true;
    } catch {
        // User cancelled or failed
    } finally {
        passkeyRegistering.value = false;
    }
}
const { openLoginModal } = useLoginModal();

interface ProfileBadge {
    slug: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    earnedAt?: string;
}

interface ProfileData {
    createdAt: string;
    badges: ProfileBadge[];
    isPro: boolean;
}

const profileData = ref<ProfileData | null>(null);
const allBadges = ref<ProfileBadge[]>([]);
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
                allBadges.value = (badges as ProfileBadge[]) ?? [];
            } catch {
                // Non-critical
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

// Dynamic Lucide icon resolver for badges
import {
    Sword,
    Star,
    Target,
    Globe,
    Crown,
    Flame,
    Trophy,
    Zap,
    CalendarCheck,
    Map,
    Award,
    LogOut,
    Fingerprint,
    Pencil,
} from 'lucide-vue-next';

const BADGE_ICONS: Record<string, typeof Award> = {
    Sword, Star, Target, Globe, Crown, Flame, Trophy, Zap, CalendarCheck, Map, Award,
};

function getBadgeIcon(iconName: string) {
    return BADGE_ICONS[iconName] || Award;
}

// Product-wide streak (any daily mode, any language)
const productStreak = ref(0);
const productBestStreak = ref(0);
const animProductStreak = useAnimatedNumber(productStreak);
const streakExpanded = ref(false);

// --- Calendar heatmap for streak (28-day rolling window) ---
interface CalendarDay {
    date: number | null;
    state: 'won' | 'lost' | 'missed' | 'today' | 'future' | 'empty';
}

function calendarDayClass(day: CalendarDay): string {
    switch (day.state) {
        case 'won': return 'bg-correct-soft';
        case 'lost': return 'cal-lost';
        case 'missed': return 'bg-muted-soft';
        case 'today': return 'outline outline-2 outline-ink -outline-offset-1';
        default: return '';
    }
}

const calendarDays = computed<CalendarDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStates = buildDailyResultMap(statsStore.gameResults);
    const todayDow = (today.getDay() + 6) % 7;
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - todayDow));
    const startDate = new Date(endOfWeek);
    startDate.setDate(startDate.getDate() - 27);
    const days: CalendarDay[] = [];
    const todayKey = toLocalDay(today);
    for (let i = 0; i < 28; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dayKey = toLocalDay(d);
        const isToday = dayKey === todayKey;
        const isFuture = d > today;
        let state: CalendarDay['state'];
        if (isToday) {
            state = dayStates.get(dayKey) || 'today';
        } else if (isFuture) {
            state = 'future';
        } else {
            state = dayStates.get(dayKey) || 'missed';
        }
        days.push({ date: d.getDate(), state });
    }
    return days;
});

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

    // --- Product-wide streak (all daily modes, all languages) ---
    const dayMap = buildDailyResultMap(statsStore.gameResults as Record<string, GameResult[]>);
    if (dayMap.size > 0) {
        const today = toLocalDay(new Date());
        let streak = 0;
        let day = today;
        while (dayMap.get(day) === 'won') { streak++; day = stepBack(day); }
        if (streak === 0 && dayMap.get(stepBack(today)) === 'won') {
            day = stepBack(today);
            while (dayMap.get(day) === 'won') { streak++; day = stepBack(day); }
        }
        productStreak.value = streak;
        // Best streak: walk all days
        let best = 0;
        let run = 0;
        const sortedDays = [...dayMap.keys()].sort();
        for (const d of sortedDays) {
            if (dayMap.get(d) === 'won') { run++; if (run > best) best = run; }
            else { run = 0; }
        }
        productBestStreak.value = best;
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
                            <button class="text-sm text-correct hover:underline flex-shrink-0" @click="saveName()">Save</button>
                            <button class="text-sm text-muted hover:underline flex-shrink-0" @click="editingName = false">Cancel</button>
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
                        v-if="passkeySupported"
                        class="text-sm text-ink hover:text-accent transition-colors flex items-center gap-1"
                        :disabled="passkeyRegistering"
                        @click="addPasskey()"
                    >
                        <Fingerprint :size="14" />
                        {{ passkeyRegistering ? 'Registering...' : passkeyAdded ? 'Passkey added' : 'Add passkey' }}
                    </button>
                    <button
                        class="text-sm text-muted hover:text-ink transition-colors flex items-center gap-1"
                        @click="authLogout()"
                    >
                        <LogOut :size="14" />
                        Sign out
                    </button>
                </div>
            </section>

            <!-- Sign-in CTA (logged out) -->
            <section v-if="!authLoggedIn && !empty" class="mb-10 border border-rule p-5 text-center">
                <h2 class="heading-body text-lg text-ink mb-2">Save your progress</h2>
                <p class="text-sm text-muted mb-4">
                    Sign in to sync stats across devices, earn badges, and protect your streak.
                </p>
                <button
                    class="px-6 py-2 bg-ink text-paper text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
                    @click="authLoginWithGoogle()"
                >
                    Sign in with Google
                </button>
                <button
                    class="block mx-auto mt-2 text-sm text-accent hover:underline"
                    @click="openLoginModal()"
                >
                    or sign in with email
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
                    style="padding: 28px 16px 24px;"
                    @click="streakExpanded = !streakExpanded"
                >
                    <Flame :size="36" :class="productStreak > 0 ? 'text-flame' : 'text-muted'" class="mx-auto mb-1" />
                    <div
                        class="font-display font-bold"
                        :class="productStreak > 0 ? 'text-flame' : 'text-ink'"
                        style="font-size: 48px; font-variation-settings: 'opsz' 144; line-height: 1;"
                    >
                        {{ Math.round(animProductStreak) }}
                    </div>
                    <div class="mono-label mt-1">Day Streak</div>
                    <div v-if="productBestStreak > 0" class="text-xs text-muted italic mt-1.5" style="font-family: var(--font-display);">
                        Best: {{ productBestStreak }} · Any daily mode, any language
                    </div>
                    <div v-else class="text-xs text-muted italic mt-1.5" style="font-family: var(--font-display);">
                        Play today's daily to start a streak
                    </div>

                    <!-- Calendar heatmap (expands on click) -->
                    <div v-if="streakExpanded" class="mt-5 pt-4 border-t border-rule text-left" @click.stop>
                        <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">Last 28 Days</div>
                        <div class="grid grid-cols-7 gap-0.5 mb-1" style="font-family: var(--font-mono); font-size: 8px; color: var(--color-muted)">
                            <span v-for="(d, i) in ['M','T','W','T','F','S','S']" :key="i" class="text-center">{{ d }}</span>
                        </div>
                        <div class="grid grid-cols-7 gap-0.5">
                            <div
                                v-for="(day, i) in calendarDays"
                                :key="i"
                                class="aspect-square rounded-sm flex items-center justify-center"
                                :class="calendarDayClass(day)"
                                style="font-family: var(--font-mono); font-size: 9px; color: var(--color-muted)"
                            >
                                <span v-if="day.date">{{ day.date }}</span>
                            </div>
                        </div>
                        <div class="flex gap-3 mt-2 justify-center" style="font-size: 9px; color: var(--color-muted); font-family: var(--font-mono)">
                            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-correct-soft inline-block" /> Won</span>
                            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm inline-block" style="background: var(--color-accent-soft, #e8d5d0)" /> Lost</span>
                            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-muted-soft inline-block" /> Missed</span>
                        </div>
                        <!-- Current / Longest row -->
                        <div class="grid grid-cols-2 gap-px bg-rule mt-3">
                            <div class="bg-paper text-center py-3">
                                <div class="font-display font-bold text-ink" style="font-size: 22px; font-variation-settings: 'opsz' 72">{{ productStreak }}</div>
                                <div class="mono-label mt-0.5">Current</div>
                            </div>
                            <div class="bg-paper text-center py-3">
                                <div class="font-display font-bold text-ink" style="font-size: 22px; font-variation-settings: 'opsz' 72">{{ productBestStreak }}</div>
                                <div class="mono-label mt-0.5">Longest</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ═══ Overview (all modes combined) ═══ -->
                <section id="statistics" class="mb-10 scroll-mt-16">
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

                <!-- Languages section removed — per-language breakdowns create anxiety.
                     Product-wide streak + overview is what matters. -->

                <!-- ═══ Badges (collapsed by default, earned first) ═══ -->
                <section v-if="allBadges.length > 0 && authLoggedIn" id="badges" class="mb-10 scroll-mt-16">
                    <div class="mono-label mb-4">Badges</div>
                    <AccountBadgeGrid
                        :badges="visibleBadges"
                        :earned-slugs="earnedSlugs"
                    />
                    <button
                        v-if="hasMoreBadges"
                        class="w-full mt-2 py-2 text-xs text-muted hover:text-ink transition-colors cursor-pointer text-center"
                        @click="badgesExpanded = !badgesExpanded"
                    >
                        {{ badgesExpanded ? 'Show fewer' : `Show all ${sortedBadges.length} badges` }}
                    </button>
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

<style scoped>
.cal-lost {
    background: var(--color-accent-soft, #e8d5d0);
}
</style>
