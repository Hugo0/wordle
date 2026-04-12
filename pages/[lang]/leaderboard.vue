<script setup lang="ts">
/**
 * Leaderboard — /[lang]/leaderboard
 *
 * Daily rankings per language and mode. Standalone page (not a game page —
 * does not use useGamePage() or langStore). Gets all data from its own API.
 *
 * Privacy: only shows username + avatar. Never email or displayName.
 */
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import { RTL_LANGS } from '~/utils/locale';
import { GAME_MODES_UI, getModeLabel } from '~/composables/useGameModes';
import { useAnimatedNumber } from '~/composables/useAnimatedNumber';

definePageMeta({
    key: (route) => `${route.params.lang}-lb`,
});

const route = useRoute();
const lang = route.params.lang as string;
const isRtl = RTL_LANGS.has(lang);

const { loggedIn } = useAuth();
const { openLoginModal } = useLoginModal();

type Period = 'today' | 'week' | 'month';
const activePeriod = ref<Period>('today');
const activeMode = ref<GameMode>(
    ((route.query.mode as string) || 'classic') as GameMode
);
const browseDay = ref<number | null>(null); // null = today

// Fetch leaderboard data
const { data: lbData, error } = await useFetch(() => `/api/${lang}/leaderboard`, {
    query: {
        mode: activeMode,
        period: activePeriod,
        day: browseDay,
    },
    watch: [activeMode, activePeriod, browseDay],
});

if (error.value && !lbData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const ui = computed(() => (lbData.value?.ui as Record<string, string>) || {});
const langName = computed(() => lbData.value?.lang_name || lang);
const dayIdx = computed(() => lbData.value?.day_idx ?? 0);
const todaysIdx = computed(() => (lbData.value as any)?.todays_idx ?? dayIdx.value);
const entries = computed(() => lbData.value?.entries ?? []);
const total = computed(() => lbData.value?.total ?? 0);
const you = computed(() => lbData.value?.you ?? null);
const period = computed(() => ((lbData.value as any)?.period ?? 'today') as Period);
const minDays = computed(() => (lbData.value as any)?.min_days ?? 1);
const modeConfig = computed(() => GAME_MODE_CONFIG[activeMode.value]);
const isSpeed = computed(() => activeMode.value === 'speed');
const maxGuesses = computed(() => modeConfig.value?.maxGuesses ?? 6);
const isToday = computed(() => period.value === 'today');
const isAgg = computed(() => period.value !== 'today');

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
const listEntries = computed(() =>
    podium.value ? entries.value.slice(3) : entries.value
);

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
    }))
);

// SEO
const modeLabel = computed(() => modeConfig.value?.label ?? 'Classic');
useSeoMeta({
    title: `Leaderboard — Wordle ${langName.value}`,
    description: `Today's ${modeLabel.value} rankings for Wordle ${langName.value}. See where you rank among other players.`,
    ogTitle: `Leaderboard — Wordle ${langName.value}`,
    ogType: 'website',
    robots: 'noindex',
});

useHead({
    htmlAttrs: { lang, dir: isRtl ? 'rtl' : 'ltr' },
});

function switchMode(mode: GameMode) {
    activeMode.value = mode;
    navigateTo({ query: { ...route.query, mode } }, { replace: true });
}

function switchPeriod(p: Period) {
    activePeriod.value = p;
    browseDay.value = null; // reset to today when switching period
}

// Historical browsing (today period only)
const canGoPrev = computed(() => isToday.value && dayIdx.value > 1);
const canGoNext = computed(() => isToday.value && dayIdx.value < todaysIdx.value);
function prevDay() {
    if (canGoPrev.value) browseDay.value = dayIdx.value - 1;
}
function nextDay() {
    if (canGoNext.value) browseDay.value = dayIdx.value + 1;
}
function goToToday() {
    browseDay.value = null;
}

function percentileLabel(pct: number): string {
    if (pct <= 1) return 'top 1%';
    return `top ${pct}%`;
}

function formatScore(entry: any): string {
    if (isSpeed.value) {
        return isAgg.value ? `avg ${entry.attempts}` : `${entry.attempts} words`;
    }
    if (isAgg.value) return `avg ${entry.attempts}`;
    return `${entry.attempts}/${maxGuesses.value}`;
}

// Empty state type
const emptyType = computed(() => {
    if (!loggedIn.value) return 'guest';
    if (total.value === 0) return 'no-players';
    if (!you.value && isToday.value) return 'not-played';
    return null;
});

const playRoute = computed(() => {
    const suffix = modeConfig.value?.routeSuffix;
    return suffix ? `/${lang}/${suffix}` : `/${lang}`;
});

const isBrowsingPast = computed(() => isToday.value && dayIdx.value < todaysIdx.value);
</script>

<template>
    <div class="min-h-screen bg-paper" :dir="isRtl ? 'rtl' : 'ltr'">
        <!-- Header -->
        <header class="editorial-rule">
            <div class="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
                <NuxtLink
                    :to="`/${lang}`"
                    class="text-muted hover:text-ink transition-colors"
                    :aria-label="ui.back || 'Back'"
                >
                    <ChevronLeft :size="20" />
                </NuxtLink>
                <div class="flex-1 min-w-0">
                    <h1 class="font-display font-extrabold text-lg text-ink">Leaderboard</h1>
                    <div class="mono-label">{{ langName }} &middot; Day #{{ dayIdx }}</div>
                </div>
                <Trophy :size="20" class="text-muted" />
            </div>
        </header>

        <div class="max-w-lg mx-auto px-4 pb-16">
            <!-- Period tabs -->
            <div class="flex border-b-2 border-rule">
                <button
                    v-for="p in (['today', 'week', 'month'] as Period[])"
                    :key="p"
                    class="flex-1 py-2.5 text-center font-mono text-[10px] tracking-[0.1em] uppercase border-b-2 -mb-[2px] transition-all cursor-pointer"
                    :class="
                        activePeriod === p
                            ? 'text-ink border-ink'
                            : 'text-muted border-transparent hover:text-ink'
                    "
                    @click="switchPeriod(p)"
                >
                    {{ p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month' }}
                </button>
            </div>

            <!-- Mode filter chips + day nav -->
            <div class="flex items-center gap-2 py-3">
                <div class="flex gap-1.5 flex-1 overflow-x-auto editorial-scroll" role="tablist">
                    <button
                        v-for="m in modes"
                        :key="m.id"
                        role="tab"
                        :aria-selected="activeMode === m.id"
                        class="font-mono text-[9px] tracking-[0.08em] uppercase px-2.5 py-1 border whitespace-nowrap transition-all cursor-pointer"
                        :class="
                            activeMode === m.id
                                ? 'bg-ink text-paper border-ink'
                                : 'bg-transparent text-muted border-rule hover:border-ink hover:text-ink'
                        "
                        @click="switchMode(m.id as GameMode)"
                    >
                        {{ m.label }}
                    </button>
                </div>
                <!-- Day navigation (today period only) -->
                <div v-if="isToday" class="flex items-center gap-1 flex-shrink-0">
                    <button
                        class="p-1 text-muted hover:text-ink transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        :disabled="!canGoPrev"
                        @click="prevDay"
                    >
                        <ChevronLeft :size="16" />
                    </button>
                    <button
                        v-if="isBrowsingPast"
                        class="font-mono text-[8px] tracking-[0.08em] uppercase text-accent hover:opacity-80 cursor-pointer px-1"
                        @click="goToToday"
                    >
                        Today
                    </button>
                    <button
                        class="p-1 text-muted hover:text-ink transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        :disabled="!canGoNext"
                        @click="nextDay"
                    >
                        <ChevronRight :size="16" />
                    </button>
                </div>
            </div>

            <!-- Aggregate period note -->
            <div v-if="isAgg" class="mono-label pb-2" style="font-size: 9px">
                Min {{ minDays }} days played to qualify &middot; Ranked by avg attempts
            </div>

            <!-- ═══ EMPTY STATE: Guest ═══ -->
            <div v-if="emptyType === 'guest'" class="text-center py-16 px-6">
                <Trophy :size="40" class="text-rule mx-auto mb-4" />
                <h2 class="font-display font-bold text-xl text-ink mb-2">Sign in to compete</h2>
                <p class="font-display italic text-sm text-muted max-w-[260px] mx-auto mb-6">
                    Create a free account to see where you rank among
                    <template v-if="total > 0">
                        today's {{ total.toLocaleString() }} players.
                    </template>
                    <template v-else>today's players.</template>
                    Your stats sync across devices too.
                </p>
                <button
                    class="px-6 py-2.5 bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer"
                    @click="openLoginModal()"
                >
                    Sign in
                </button>

                <template v-if="entries.length > 0">
                    <div class="border-t border-rule mt-8 pt-6">
                        <div class="mono-label mb-3 text-start">Today's rankings</div>
                        <ol class="lb-list">
                            <li v-for="entry in entries" :key="entry.rank" class="lb-row">
                                <div class="lb-rank" :class="rankClass(entry.rank)">{{ entry.rank }}</div>
                                <LbAvatar :username="entry.username" :avatar-url="entry.avatarUrl" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm font-semibold text-ink truncate">{{ entry.username }}</div>
                                </div>
                                <div class="font-mono text-sm font-bold flex-shrink-0">{{ formatScore(entry) }}</div>
                            </li>
                        </ol>
                    </div>
                </template>
            </div>

            <!-- ═══ EMPTY STATE: No players yet ═══ -->
            <div v-else-if="emptyType === 'no-players'" class="text-center py-16 px-6">
                <Trophy :size="40" class="text-rule mx-auto mb-4 opacity-30" />
                <h2 class="font-display font-bold text-xl text-ink mb-2">New day, empty board</h2>
                <p class="font-display italic text-sm text-muted max-w-[260px] mx-auto mb-6">
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
                <!-- Podium -->
                <div v-if="podium" class="podium">
                    <div v-for="(place, idx) in [podium.second, podium.first, podium.third]" :key="idx" class="podium-place" :class="['second', 'first', 'third'][idx]">
                        <LbAvatar :username="place!.username" :avatar-url="place!.avatarUrl" :size="idx === 1 ? 'lg' : 'md'" />
                        <div class="podium-name">{{ place!.username }}</div>
                        <div class="podium-bar" :class="['second', 'first', 'third'][idx]">
                            <div class="podium-stat">{{ formatScore(place) }}</div>
                        </div>
                    </div>
                </div>

                <ol class="lb-list">
                    <li v-for="entry in listEntries" :key="entry.rank" class="lb-row">
                        <div class="lb-rank" :class="rankClass(entry.rank)">{{ entry.rank }}</div>
                        <LbAvatar :username="entry.username" :avatar-url="entry.avatarUrl" />
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-ink truncate">{{ entry.username }}</div>
                            <div v-if="isAgg && entry.daysPlayed" class="font-mono text-[9px] text-muted">{{ entry.daysPlayed }} days</div>
                        </div>
                        <div class="font-mono text-sm font-bold flex-shrink-0">{{ formatScore(entry) }}</div>
                    </li>
                </ol>

                <div class="text-center border-t border-rule mt-4 pt-6 pb-2">
                    <h3 class="font-display font-bold text-base text-ink mb-1">You haven't played today</h3>
                    <p class="font-display italic text-xs text-muted mb-4">Solve today's puzzle to see where you rank</p>
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
                <!-- Your position (sticky bar) with animated rank -->
                <div
                    v-if="you"
                    class="flex items-center gap-3 px-4 py-2.5 bg-paper-warm border-y-2 border-ink mb-4"
                >
                    <div class="font-mono text-sm font-bold w-8 text-center">#{{ displayRank }}</div>
                    <LbAvatar :username="you.username" :avatar-url="you.avatarUrl" size="sm" />
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-semibold text-ink truncate">
                            {{ you.username }}
                            <span class="font-mono text-[8px] tracking-[0.1em] uppercase bg-ink text-paper px-1 py-px ms-1.5 align-middle">YOU</span>
                        </div>
                        <div v-if="isAgg && you.daysPlayed" class="font-mono text-[9px] text-muted">{{ you.daysPlayed }} days played</div>
                    </div>
                    <div class="text-end flex-shrink-0">
                        <div class="font-mono text-sm font-bold">{{ formatScore(you) }}</div>
                        <div class="font-mono text-[8px] text-muted">{{ percentileLabel(you.percentile) }}</div>
                    </div>
                </div>

                <!-- Podium -->
                <div v-if="podium" class="podium">
                    <div v-for="(place, idx) in [podium.second, podium.first, podium.third]" :key="idx" class="podium-place" :class="['second', 'first', 'third'][idx]">
                        <LbAvatar :username="place!.username" :avatar-url="place!.avatarUrl" :size="idx === 1 ? 'lg' : 'md'" />
                        <div class="podium-name">{{ place!.username }}</div>
                        <div class="podium-bar" :class="['second', 'first', 'third'][idx]">
                            <div class="podium-stat">{{ formatScore(place) }}</div>
                        </div>
                    </div>
                </div>

                <!-- Main list (after podium, starts at #4) -->
                <ol class="lb-list">
                    <li
                        v-for="entry in listEntries"
                        :key="entry.rank"
                        class="lb-row"
                        :class="{ 'lb-row-you': you && entry.username === you.username }"
                    >
                        <div class="lb-rank" :class="rankClass(entry.rank)">{{ entry.rank }}</div>
                        <LbAvatar :username="entry.username" :avatar-url="entry.avatarUrl" />
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-ink truncate">
                                {{ entry.username }}
                                <span
                                    v-if="you && entry.username === you.username"
                                    class="font-mono text-[8px] tracking-[0.1em] uppercase bg-ink text-paper px-1 py-px ms-1.5 align-middle"
                                >YOU</span>
                            </div>
                            <div v-if="isAgg && entry.daysPlayed" class="font-mono text-[9px] text-muted">{{ entry.daysPlayed }} days</div>
                        </div>
                        <div class="font-mono text-sm font-bold flex-shrink-0">{{ formatScore(entry) }}</div>
                    </li>
                </ol>

                <div v-if="total > entries.length" class="text-center py-4">
                    <div class="mono-label">
                        Showing {{ entries.length }} of {{ total.toLocaleString() }} players
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
// LbAvatar: avatar circle with initial fallback
const LbAvatar = defineComponent({
    props: {
        username: { type: String, required: true },
        avatarUrl: { type: String as PropType<string | null>, default: null },
        size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md' },
    },
    setup(props) {
        const sizeClass = computed(() => {
            if (props.size === 'sm') return 'w-7 h-7';
            if (props.size === 'lg') return 'w-12 h-12';
            return 'w-8 h-8';
        });
        const fontSize = computed(() => (props.size === 'lg' ? 'text-base' : 'text-xs'));
        const initial = computed(() => props.username.charAt(0).toUpperCase());
        return () =>
            props.avatarUrl
                ? h('img', {
                      src: props.avatarUrl,
                      alt: props.username,
                      class: `${sizeClass.value} rounded-full object-cover flex-shrink-0`,
                      referrerpolicy: 'no-referrer',
                  })
                : h(
                      'div',
                      {
                          class: `${sizeClass.value} rounded-full bg-rule text-muted flex items-center justify-center font-display ${fontSize.value} font-bold flex-shrink-0`,
                      },
                      initial.value
                  );
    },
});

function rankClass(rank: number): Record<string, boolean> {
    return {
        'lb-rank-gold': rank === 1,
        'lb-rank-silver': rank === 2,
        'lb-rank-bronze': rank === 3,
    };
}
</script>

<style scoped>
.lb-list {
    list-style: none;
    margin: 0;
    padding: 0;
}
.lb-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 4px;
    border-bottom: 1px solid var(--color-rule);
    transition: background 0.15s;
}
.lb-row:hover {
    background: var(--color-paper-warm);
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
.lb-rank-gold { color: #c9a930; }
.lb-rank-silver { color: #8a8a8a; }
.lb-rank-bronze { color: #a0622e; }

/* Podium */
.podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
    padding: 16px 8px 0;
    border-bottom: 1px solid var(--color-rule);
    margin-bottom: 8px;
}
.podium-place {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}
.podium-place.first { order: 2; }
.podium-place.second { order: 1; }
.podium-place.third { order: 3; }
.podium-name {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    max-width: 72px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-ink);
}
.podium-bar {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 4px 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-muted);
}
.podium-bar.first {
    background: #fff1e6;
    height: 72px;
}
.podium-bar.second {
    background: var(--color-rule);
    height: 56px;
}
.podium-bar.third {
    background: #e8d5d0;
    height: 44px;
}
.podium-stat {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-ink);
}

/* Avatar borders for podium */
.podium-place.first :deep(img),
.podium-place.first :deep(div:first-child) {
    border: 2px solid #c9a930;
}
.podium-place.second :deep(img),
.podium-place.second :deep(div:first-child) {
    border: 2px solid #8a8a8a;
}
.podium-place.third :deep(img),
.podium-place.third :deep(div:first-child) {
    border: 2px solid #a0622e;
}
</style>
