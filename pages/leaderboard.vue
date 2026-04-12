<script setup lang="ts">
/**
 * Leaderboard — /[lang]/leaderboard
 *
 * Daily rankings per language and mode. Standalone page (not a game page —
 * does not use useGamePage() or langStore). Gets all data from its own API.
 *
 * Privacy: only shows username + avatar. Never email or displayName.
 */
import { Trophy, ChevronLeft, ChevronRight, Flame, Award } from 'lucide-vue-next';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import { RTL_LANGS } from '~/utils/locale';
import { NEW_MODES_START_IDX } from '~/utils/day-index';
import { GAME_MODES_UI, getModeLabel } from '~/composables/useGameModes';
import { useAnimatedNumber } from '~/composables/useAnimatedNumber';
import { useFlag } from '~/composables/useFlag';

definePageMeta({
    key: (route) => `lb-${route.query.lang || 'en'}`,
});

const route = useRoute();
// Language is an optional query param — defaults to 'en'
const lang = ref((route.query.lang as string) || 'en');
const isRtl = computed(() => RTL_LANGS.has(lang.value));

const { loggedIn } = useAuth();
const { openLoginModal } = useLoginModal();
const flagSrc = computed(() => useFlag(lang.value));
const showLangPicker = ref(false);

function switchLang(newLang: string) {
    lang.value = newLang;
    showLangPicker.value = false;
    updateQuery();
}

type Period = 'today' | 'week' | 'month' | 'streaks' | 'records';
const VALID_PERIODS: Period[] = ['today', 'week', 'month', 'streaks', 'records'];

// All state from URL so links are shareable (e.g. /yo/leaderboard?mode=speed&period=streaks&day=1756)
const activePeriod = ref<Period>(
    VALID_PERIODS.includes(route.query.period as Period) ? (route.query.period as Period) : 'today'
);
const activeMode = ref<GameMode>(((route.query.mode as string) || 'classic') as GameMode);
const browseDay = ref<number | null>(
    route.query.day ? parseInt(route.query.day as string, 10) : null
);

// Build query params — omit nulls so the API uses defaults
const fetchQuery = computed(() => {
    const q: Record<string, string> = { mode: activeMode.value, period: activePeriod.value };
    if (browseDay.value != null) q.day = String(browseDay.value);
    return q;
});

// Fetch leaderboard data (API still uses [lang] route param)
const { data: lbData, error } = await useFetch(() => `/api/${lang.value}/leaderboard`, {
    query: fetchQuery,
    watch: [fetchQuery, lang],
});

if (error.value && !lbData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

// Response data — cast-free access via helper
const resp = computed(() => (lbData.value as any) ?? {});
const ui = computed(() => (resp.value.ui as Record<string, string>) || {});
const langName = computed(() => resp.value.lang_name || lang);
const dayIdx = computed(() => resp.value.day_idx ?? 0);
const todaysIdx = computed(() => resp.value.todays_idx ?? dayIdx.value);
const entries = computed(() => resp.value.entries ?? []);
const total = computed(() => resp.value.total ?? 0);
const you = computed(() => resp.value.you ?? null);
const minDays = computed(() => resp.value.min_days ?? 1);
const records = computed(() => resp.value.records ?? []);
const modeConfig = computed(() => GAME_MODE_CONFIG[activeMode.value]);
const isSpeed = computed(() => activeMode.value === 'speed');
const maxGuesses = computed(() => modeConfig.value?.maxGuesses ?? 6);
// Derive period state from activePeriod (no round-trip through server)
const isToday = computed(() => activePeriod.value === 'today');
const isStreaks = computed(() => activePeriod.value === 'streaks');
const isRecords = computed(() => activePeriod.value === 'records');
const isAgg = computed(() => activePeriod.value === 'week' || activePeriod.value === 'month');

// Podium: top 3 entries (only for populated state with 3+ entries)
const podium = computed(() => {
    if (entries.value.length < 3) return null;
    return {
        first: entries.value[0],
        second: entries.value[1],
        third: entries.value[2],
    };
});
// List entries after podium (skip top 3 if podium is shown)
const listEntries = computed(() => (podium.value ? entries.value.slice(3) : entries.value));

// Is the user visible in the entries list (including podium)?
const youInVisibleList = computed(() => {
    if (!you.value) return false;
    return entries.value.some((e: any) => e.username === you.value!.username);
});

// Animated rank
const yourRank = computed(() => you.value?.rank ?? 0);
const animatedRank = useAnimatedNumber(yourRank, { duration: 800 });
const displayRank = computed(() => Math.round(animatedRank.value));

// Mode filter — only daily-supporting modes that are enabled
const modes = computed(() =>
    GAME_MODES_UI.filter(
        (m) => m.enabled && m.id !== 'unlimited' && m.supportedPlayTypes.includes('daily')
    ).map((m) => ({
        id: m.id,
        label: getModeLabel(m, ui.value),
        icon: m.icon,
    }))
);

const periodTabs = [
    { id: 'today' as Period, label: 'Today', icon: null },
    { id: 'week' as Period, label: 'Week', icon: null },
    { id: 'month' as Period, label: 'Month', icon: null },
    { id: 'streaks' as Period, label: 'Streaks', icon: Flame },
    { id: 'records' as Period, label: 'Records', icon: Award },
];

// Active mode label for display below the icon bar
const activeModeLabel = computed(
    () => modes.value.find((m) => m.id === activeMode.value)?.label ?? 'Classic'
);

// SEO
const modeLabel = computed(() => modeConfig.value?.label ?? 'Classic');
useSeoMeta({
    title: `Leaderboard — Wordle Global`,
    description: `Daily ${modeLabel.value} rankings across 80 languages. Compete with players worldwide on Wordle Global.`,
    ogTitle: `Leaderboard — Wordle Global`,
    ogUrl: 'https://wordle.global/leaderboard',
    ogType: 'website',
    robots: 'noindex',
});

useHead({
    htmlAttrs: { lang: lang.value, dir: isRtl.value ? 'rtl' : 'ltr' },
    link: [{ rel: 'canonical', href: 'https://wordle.global/leaderboard' }],
});

function updateQuery() {
    const q: Record<string, string> = {};
    const isGlobal = activePeriod.value === 'streaks' || activePeriod.value === 'records';
    // Global tabs (streaks/records) don't use lang or mode
    if (!isGlobal && lang.value !== 'en') q.lang = lang.value;
    if (!isGlobal && activeMode.value !== 'classic') q.mode = activeMode.value;
    if (activePeriod.value !== 'today') q.period = activePeriod.value;
    if (!isGlobal && browseDay.value != null) q.day = String(browseDay.value);
    navigateTo({ path: '/leaderboard', query: q }, { replace: true });
}

function switchMode(mode: GameMode) {
    activeMode.value = mode;
    updateQuery();
}

function switchPeriod(p: Period) {
    activePeriod.value = p;
    browseDay.value = null;
    updateQuery();
}

// Historical browsing (today period only)
const earliestDay = computed(() => (activeMode.value === 'classic' ? 1 : NEW_MODES_START_IDX));
const canGoPrev = computed(() => isToday.value && dayIdx.value > earliestDay.value);
const canGoNext = computed(() => isToday.value && dayIdx.value < todaysIdx.value);
function prevDay() {
    if (canGoPrev.value) {
        browseDay.value = dayIdx.value - 1;
        updateQuery();
    }
}
function nextDay() {
    if (canGoNext.value) {
        browseDay.value = dayIdx.value + 1;
        updateQuery();
    }
}
function goToToday() {
    browseDay.value = null;
    updateQuery();
}

function percentileLabel(pct: number): string {
    if (pct <= 1) return 'top 1%';
    return `top ${pct}%`;
}

function formatScore(entry: any): string {
    if (isStreaks.value) return String(entry.attempts);
    if (isSpeed.value) {
        if (isAgg.value) return `avg ${entry.attempts} pts`;
        return `${(entry.score ?? entry.attempts).toLocaleString()} pts`;
    }
    if (isAgg.value) return `avg ${entry.attempts}`;
    return `${entry.attempts}/${maxGuesses.value}`;
}

function formatScoreSub(entry: any): string | null {
    if (isStreaks.value) return 'day streak';
    if (isSpeed.value && entry.wordsSolved != null) {
        if (isAgg.value) return `avg ${entry.wordsSolved} words`;
        return `${entry.wordsSolved} words`;
    }
    return null;
}

// Empty state type (records tab handles its own empty state)
const emptyType = computed(() => {
    if (isRecords.value) return null;
    if (!loggedIn.value) return 'guest';
    if (total.value === 0) return 'no-players';
    if (!you.value && isToday.value) return 'not-played';
    return null;
});

const playRoute = computed(() => {
    const suffix = modeConfig.value?.routeSuffix;
    return suffix ? `/${lang.value}/${suffix}` : `/${lang.value}`;
});

const isBrowsingPast = computed(() => isToday.value && dayIdx.value < todaysIdx.value);
</script>

<template>
    <AppShell :lang="lang" :lang-name="langName" :ui="ui" :is-rtl="isRtl">
        <div class="max-w-2xl mx-auto px-4 pb-16">
            <!-- Page header — adapts to global vs language-specific tabs -->
            <header class="pt-6 pb-4">
                <div class="flex items-center gap-3">
                    <Trophy :size="20" class="text-muted flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                        <h1 class="font-display font-extrabold text-xl text-ink">Leaderboard</h1>
                        <div v-if="isStreaks || isRecords" class="mono-label">
                            All languages &middot; All modes
                        </div>
                        <div v-else class="mono-label flex items-center gap-1.5">
                            <img
                                v-if="flagSrc"
                                :src="flagSrc"
                                :alt="langName"
                                class="w-3.5 h-3.5 rounded-full object-cover"
                            />
                            {{ langName }} &middot; Day #{{ dayIdx }}
                        </div>
                    </div>
                </div>
            </header>
            <!-- Period tabs -->
            <div class="flex border-b-2 border-rule" role="tablist" aria-label="Leaderboard period">
                <button
                    v-for="p in periodTabs"
                    :key="p.id"
                    role="tab"
                    :aria-selected="activePeriod === p.id"
                    class="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.1em] uppercase border-b-2 -mb-[2px] transition-all cursor-pointer whitespace-nowrap"
                    :class="
                        activePeriod === p.id
                            ? 'text-ink border-ink'
                            : 'text-muted border-transparent hover:text-ink'
                    "
                    @click="switchPeriod(p.id)"
                >
                    <component :is="p.icon" v-if="p.icon" :size="12" />
                    {{ p.label }}
                </button>
            </div>

            <!-- Language + mode icons + day nav (hidden on global tabs: streaks/records) -->
            <div v-if="!isStreaks && !isRecords" class="flex items-center gap-3 py-3">
                <!-- Language chip -->
                <button
                    class="flex items-center gap-1.5 px-2 py-1 border border-rule text-xs text-ink hover:border-ink transition-colors cursor-pointer flex-shrink-0"
                    :title="`Filtering: ${langName}. Click to change.`"
                    @click="showLangPicker = true"
                >
                    <img
                        v-if="flagSrc"
                        :src="flagSrc"
                        :alt="langName"
                        class="w-4 h-4 rounded-full object-cover"
                    />
                    <span class="font-mono text-[9px] uppercase tracking-wide">{{ lang }}</span>
                </button>
                <div class="flex gap-1 flex-1" role="tablist" aria-label="Game mode">
                    <button
                        v-for="m in modes"
                        :key="m.id"
                        role="tab"
                        :aria-selected="activeMode === m.id"
                        :aria-label="m.label"
                        :title="m.label"
                        class="w-9 h-9 flex items-center justify-center border transition-all cursor-pointer"
                        :class="
                            activeMode === m.id
                                ? 'bg-ink text-paper border-ink'
                                : 'bg-transparent text-muted border-rule hover:border-ink hover:text-ink'
                        "
                        @click="switchMode(m.id as GameMode)"
                    >
                        <component :is="m.icon" :size="16" />
                    </button>
                </div>
                <!-- Day navigation (today period only) -->
                <div v-if="isToday" class="flex items-center gap-1 flex-shrink-0">
                    <button
                        aria-label="Previous day"
                        class="p-1 text-muted hover:text-ink transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        :disabled="!canGoPrev"
                        @click="prevDay"
                    >
                        <ChevronLeft :size="16" />
                    </button>
                    <button
                        v-if="isBrowsingPast"
                        class="font-mono text-[9px] tracking-[0.06em] text-accent hover:opacity-80 cursor-pointer px-1"
                        @click="goToToday"
                    >
                        #{{ dayIdx }} &rarr; Today
                    </button>
                    <button
                        aria-label="Next day"
                        class="p-1 text-muted hover:text-ink transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        :disabled="!canGoNext"
                        @click="nextDay"
                    >
                        <ChevronRight :size="16" />
                    </button>
                </div>
            </div>

            <!-- Active mode label + ranking explanation -->
            <div v-if="!isStreaks && !isRecords" class="mono-label pb-1" style="font-size: 9px">
                {{ activeModeLabel }}
            </div>
            <div class="font-display italic text-xs text-muted pb-3" :class="{ 'pt-3': isStreaks || isRecords }">
                <template v-if="isRecords">
                    All-time records across all languages and modes.
                </template>
                <template v-else-if="isStreaks">
                    Consecutive days with any daily win. Play every day to climb.
                </template>
                <template v-else-if="isAgg && isSpeed">
                    Average score per day &mdash; higher is better. Min {{ minDays }} days played to
                    qualify.
                </template>
                <template v-else-if="isAgg">
                    Average guesses per day &mdash; lower is better. Min {{ minDays }} days played
                    to qualify.
                </template>
                <template v-else-if="isSpeed">
                    Highest score wins. Points from words solved, combos, and speed.
                </template>
                <template v-else> Fewest guesses wins. Ties broken by who played first. </template>
            </div>

            <!-- Content area — fades on tab/mode switch -->
            <Transition name="lb-fade" mode="out-in">
                <div :key="`${activePeriod}-${activeMode}-${dayIdx}`" class="lb-content">
                    <!-- ═══ RECORDS VIEW ═══ -->
                    <div v-if="isRecords" class="py-6">
                        <div v-if="records.length === 0" class="text-center py-12">
                            <Trophy :size="40" class="text-rule mx-auto mb-4 opacity-30" />
                            <h2 class="font-display font-bold text-lg text-ink mb-2">
                                No records yet
                            </h2>
                            <p class="font-display italic text-sm text-muted">
                                Play more games to set records.
                            </p>
                        </div>
                        <div v-else class="grid grid-cols-2 gap-3">
                            <div
                                v-for="(rec, i) in records"
                                :key="i"
                                class="border border-rule p-4"
                            >
                                <div class="mono-label mb-2" style="font-size: 9px">
                                    {{ rec.label }}
                                </div>
                                <div
                                    class="font-display font-extrabold text-xl text-ink mb-2"
                                    style="font-variation-settings: 'opsz' 72"
                                >
                                    {{ rec.value }}
                                </div>
                                <div class="flex items-center gap-2">
                                    <LbAvatar
                                        :username="rec.username"
                                        :avatar-url="rec.avatarUrl"
                                        size="sm"
                                    />
                                    <div class="text-xs font-semibold text-ink truncate">
                                        {{ rec.username }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ═══ EMPTY STATE: Guest ═══ -->
                    <div v-else-if="emptyType === 'guest'" class="text-center py-16 px-6">
                        <Trophy :size="40" class="text-rule mx-auto mb-4" />
                        <h2 class="font-display font-bold text-xl text-ink mb-2">
                            Sign in to compete
                        </h2>
                        <p
                            class="font-display italic text-sm text-muted max-w-[260px] mx-auto mb-4"
                        >
                            Join 1.6 million players worldwide. Create a free account to see where
                            you rank
                            <template v-if="total > 0">
                                among today's {{ total.toLocaleString() }} players.
                            </template>
                            <template v-else>on today's leaderboard.</template>
                        </p>
                        <div class="mono-label mb-6" style="font-size: 9px">
                            6.4M+ games played &middot; 80 languages
                        </div>
                        <button
                            class="px-6 py-2.5 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer"
                            @click="openLoginModal()"
                        >
                            Sign in
                        </button>

                        <template v-if="entries.length > 0">
                            <div class="border-t border-rule mt-8 pt-6">
                                <div class="mono-label mb-3 text-start">Today's rankings</div>
                                <LbList
                                    :entries="entries"
                                    :is-streaks="isStreaks"
                                    :is-agg="isAgg"
                                    :format-score="formatScore"
                                    :format-score-sub="formatScoreSub"
                                />
                            </div>
                        </template>
                    </div>

                    <!-- ═══ EMPTY STATE: No players yet ═══ -->
                    <div v-else-if="emptyType === 'no-players'" class="text-center py-16 px-6">
                        <Trophy :size="40" class="text-rule mx-auto mb-4 opacity-30" />
                        <h2 class="font-display font-bold text-xl text-ink mb-2">
                            New day, empty board
                        </h2>
                        <p
                            class="font-display italic text-sm text-muted max-w-[260px] mx-auto mb-6"
                        >
                            Be the first to solve today's word and claim the #1 spot.
                        </p>
                        <NuxtLink
                            :to="playRoute"
                            class="inline-block px-6 py-2.5 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
                        >
                            Play now
                        </NuxtLink>
                    </div>

                    <!-- ═══ EMPTY STATE: Logged in, haven't played ═══ -->
                    <div v-else-if="emptyType === 'not-played'" class="py-4">
                        <LbPodium
                            v-if="podium"
                            :podium="podium"
                            :is-streaks="isStreaks"
                            :format-score="formatScore"
                        />

                        <LbList
                            :entries="listEntries"
                            :is-streaks="isStreaks"
                            :is-agg="isAgg"
                            :format-score="formatScore"
                            :format-score-sub="formatScoreSub"
                        />

                        <div class="text-center mt-4 pt-6 pb-2">
                            <h3 class="font-display font-bold text-base text-ink mb-1">
                                You haven't played today
                            </h3>
                            <p class="font-display italic text-xs text-muted mb-4">
                                Solve today's puzzle to see where you rank
                            </p>
                            <NuxtLink
                                :to="playRoute"
                                class="inline-block px-6 py-2.5 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85"
                            >
                                Play now
                            </NuxtLink>
                        </div>
                    </div>

                    <!-- ═══ POPULATED STATE ═══ -->
                    <div v-else class="py-4">
                        <LbPodium
                            v-if="podium"
                            :podium="podium"
                            :you="you"
                            show-you
                            :is-streaks="isStreaks"
                            :format-score="formatScore"
                        />

                        <LbList
                            :entries="listEntries"
                            :you="you"
                            show-you
                            :is-streaks="isStreaks"
                            :is-agg="isAgg"
                            :format-score="formatScore"
                            :format-score-sub="formatScoreSub"
                        />

                        <!-- Your position (appended at bottom when you're outside the visible list) -->
                        <div v-if="you && !youInVisibleList" class="lb-you-below">
                            <div class="mono-label text-center py-2">&#8942;</div>
                            <div class="lb-row lb-row-you">
                                <div class="lb-rank">#{{ displayRank }}</div>
                                <LbAvatar :username="you.username" :avatar-url="you.avatarUrl" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-semibold text-ink truncate">
                                        {{ you.username }}
                                        <span
                                            class="font-mono text-[8px] tracking-[0.1em] uppercase bg-ink text-paper px-1 py-px ms-1.5 align-middle"
                                            >YOU</span
                                        >
                                    </div>
                                    <div
                                        v-if="isAgg && you.daysPlayed"
                                        class="font-mono text-[9px] text-muted"
                                    >
                                        {{ you.daysPlayed }} days
                                    </div>
                                </div>
                                <div class="text-end flex-shrink-0">
                                    <div class="font-mono text-sm font-bold">
                                        {{ formatScore(you) }}
                                    </div>
                                    <div class="font-mono text-[8px] text-muted">
                                        #{{ you.rank }} of {{ total.toLocaleString() }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="total > entries.length" class="text-center py-4">
                            <div class="mono-label">
                                Showing {{ entries.length }} of {{ total.toLocaleString() }} players
                            </div>
                        </div>
                    </div>
                </div>
                <!-- /lb-content -->
            </Transition>
        </div>

        <!-- Language picker modal (select-only mode — updates query param, doesn't navigate) -->
        <LanguagePickerModal
            :visible="showLangPicker"
            :current-lang-code="lang"
            select-only
            @select="switchLang"
            @close="showLangPicker = false"
        />
    </AppShell>
</template>


<style scoped>
/* "Your position" row at bottom of populated state — still in parent template */
.lb-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 4px;
    border-bottom: 1px solid var(--color-rule);
    transition: background 0.15s;
}
.lb-row-you {
    background: var(--color-paper-warm);
    border-inline-start: 3px solid var(--color-ink);
    padding-inline-start: 1px;
}
.lb-rank {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
}
.lb-you-below {
    border-top: 2px dashed var(--color-rule);
    margin-top: 4px;
}

/* Content fade transition on tab/mode switch */
.lb-content {
    min-height: 400px;
}
.lb-fade-enter-active,
.lb-fade-leave-active {
    transition: opacity 0.15s ease;
}
.lb-fade-enter-from,
.lb-fade-leave-to {
    opacity: 0;
}
</style>
