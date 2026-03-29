<template>
    <SharedBaseModal :visible="visible" size="sm" @close="$emit('close')">
        <div class="flex flex-col gap-0">
            <!-- Hero -->
            <div class="text-center mb-4">
                <Flame :size="36" class="text-flame mx-auto mb-2" />
                <div
                    class="font-display font-extrabold text-flame"
                    style="font-size: 48px; font-variation-settings: 'opsz' 144; line-height: 1"
                >
                    {{ currentStreak }}
                </div>
                <div class="mono-label mt-1">Day Streak</div>
                <p class="text-xs text-muted mt-2">
                    {{ motivationalText }}
                </p>
            </div>

            <div class="editorial-rule" />

            <!-- Calendar heatmap: rolling 28 days -->
            <div class="py-3">
                <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">
                    Last 28 Days
                </div>
                <div
                    class="grid grid-cols-7 gap-0.5 mb-1"
                    style="font-family: var(--font-mono); font-size: 8px; color: var(--color-muted)"
                >
                    <span
                        v-for="d in ['M', 'T', 'W', 'T', 'F', 'S', 'S']"
                        :key="d"
                        class="text-center"
                    >
                        {{ d }}
                    </span>
                </div>
                <div class="grid grid-cols-7 gap-0.5">
                    <div
                        v-for="(day, i) in calendarDays"
                        :key="i"
                        class="aspect-square rounded-sm flex items-center justify-center"
                        :class="calendarDayClass(day)"
                        style="
                            font-family: var(--font-mono);
                            font-size: 9px;
                            color: var(--color-muted);
                        "
                    >
                        <span v-if="day.date">{{ day.date }}</span>
                    </div>
                </div>
                <!-- Legend -->
                <div
                    class="flex gap-3 mt-2 justify-center"
                    style="font-size: 9px; color: var(--color-muted); font-family: var(--font-mono)"
                >
                    <span class="flex items-center gap-1"
                        ><span class="w-2 h-2 rounded-sm bg-correct-soft inline-block" /> Won</span
                    >
                    <span class="flex items-center gap-1"
                        ><span
                            class="w-2 h-2 rounded-sm inline-block"
                            style="background: var(--color-accent-soft, #e8d5d0)"
                        />
                        Lost</span
                    >
                    <span class="flex items-center gap-1"
                        ><span class="w-2 h-2 rounded-sm bg-muted-soft inline-block" /> Missed</span
                    >
                </div>
            </div>

            <div class="editorial-rule" />

            <!-- Stats row -->
            <div class="grid grid-cols-2 gap-px bg-rule">
                <div class="bg-paper text-center py-3">
                    <div
                        class="font-display font-bold text-ink"
                        style="font-size: 22px; font-variation-settings: 'opsz' 72"
                    >
                        {{ currentStreak }}
                    </div>
                    <div class="mono-label mt-0.5">Current</div>
                </div>
                <div class="bg-paper text-center py-3">
                    <div
                        class="font-display font-bold text-ink"
                        style="font-size: 22px; font-variation-settings: 'opsz' 72"
                    >
                        {{ longestStreak }}
                    </div>
                    <div class="mono-label mt-0.5">Longest</div>
                </div>
            </div>

            <!-- Per-language breakdown: wins, not streaks -->
            <div v-if="languageWins.length > 0" class="pt-3">
                <div class="editorial-rule mb-3" />
                <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">
                    Wins by Language
                </div>
                <div class="space-y-1.5">
                    <div
                        v-for="lw in visibleLanguageWins"
                        :key="lw.lang"
                        class="flex items-center justify-between text-sm"
                    >
                        <span class="flex items-center gap-1.5 text-ink capitalize">
                            <img
                                v-if="useFlag(lw.lang)"
                                :src="useFlag(lw.lang)!"
                                :alt="lw.lang"
                                class="w-4 h-4 rounded-full"
                            />
                            {{ lw.lang }}
                        </span>
                        <span class="font-mono text-xs text-muted">
                            {{ lw.wins }} {{ lw.wins === 1 ? 'win' : 'wins' }}
                            <span v-if="lw.games > lw.wins" class="text-muted/60"
                                >/ {{ lw.games }} played</span
                            >
                        </span>
                    </div>
                </div>
                <button
                    v-if="languageWins.length > 5"
                    class="w-full text-center text-xs text-muted hover:text-ink transition-colors mt-2 py-1"
                    style="font-family: var(--font-mono); letter-spacing: 0.05em"
                    @click="showAllLangs = !showAllLangs"
                >
                    {{ showAllLangs ? 'Show less' : `+${languageWins.length - 5} more` }}
                </button>
            </div>

            <!-- Footer note -->
            <div class="pt-3 mt-3 border-t border-rule">
                <p class="text-[11px] text-muted text-center">
                    Streak counts classic daily puzzles in any language.
                    <br />
                    Play once a day to keep it going.
                </p>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Flame } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { toLocalDay, buildDailyResultMap } from '~/utils/streak-dates';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const game = useGameStore();
const statsStore = useStatsStore();

const currentStreak = computed(() => game.effectiveStreak);
const longestStreak = computed(() => statsStore.totalStats.longest_overall_streak);

const motivationalText = computed(() => {
    const s = currentStreak.value;
    if (s === 0) return 'Win a daily puzzle to start your streak!';
    if (s === 1) return 'Great start! Come back tomorrow.';
    if (s < 7) return 'Building momentum — keep it going!';
    if (s < 30) return "You're on fire!";
    if (s < 100) return 'Incredible dedication.';
    return 'Legendary.';
});

// --- Calendar heatmap: rolling 28 days ---

interface CalendarDay {
    date: number | null;
    state: 'won' | 'lost' | 'missed' | 'today' | 'future' | 'empty';
}

function calendarDayClass(day: CalendarDay): string {
    switch (day.state) {
        case 'won':
            return 'bg-correct-soft';
        case 'lost':
            return 'cal-lost';
        case 'missed':
            return 'bg-muted-soft';
        case 'today':
            return 'outline outline-2 outline-ink -outline-offset-1';
        default:
            return '';
    }
}

const calendarDays = computed<CalendarDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayStates = buildDailyResultMap(statsStore.gameResults);

    // Find the Monday that starts our 28-day window
    // We want 4 complete weeks ending with today's week
    const todayDow = (today.getDay() + 6) % 7; // Mon=0
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - todayDow)); // Sunday of this week
    const startDate = new Date(endOfWeek);
    startDate.setDate(startDate.getDate() - 27); // 28 days total

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
            // Today: show won/lost if played, otherwise 'today' (outline)
            const played = dayStates.get(dayKey);
            state = played || 'today';
        } else if (isFuture) {
            state = 'future';
        } else {
            const played = dayStates.get(dayKey);
            state = played || 'missed';
        }

        days.push({ date: d.getDate(), state });
    }

    return days;
});

// --- Per-language wins (not streaks) ---
const showAllLangs = ref(false);

const languageWins = computed(() => {
    const result: { lang: string; wins: number; games: number }[] = [];
    for (const [lang, stats] of Object.entries(statsStore.totalStats.game_stats)) {
        if (stats.n_games > 0) {
            result.push({ lang, wins: stats.n_wins, games: stats.n_games });
        }
    }
    return result.sort((a, b) => b.wins - a.wins);
});

const visibleLanguageWins = computed(() =>
    showAllLangs.value ? languageWins.value : languageWins.value.slice(0, 5)
);
</script>

<style scoped>
.cal-lost {
    background: var(--color-accent-soft, #e8d5d0);
}
</style>
