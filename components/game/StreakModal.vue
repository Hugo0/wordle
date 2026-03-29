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

            <!-- Calendar heatmap -->
            <div class="py-3">
                <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">
                    {{ calendarTitle }}
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
                        :class="{
                            'bg-correct-soft': day.played,
                            'bg-muted-soft': day.missed,
                            'outline outline-2 outline-ink -outline-offset-1': day.today,
                        }"
                        style="
                            font-family: var(--font-mono);
                            font-size: 9px;
                            color: var(--color-muted);
                        "
                    >
                        <span v-if="day.date">{{ day.date }}</span>
                    </div>
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

            <!-- Per-language breakdown -->
            <div v-if="languageStreaks.length > 0" class="pt-3">
                <div class="editorial-rule mb-3" />
                <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">
                    Per Language
                </div>
                <div class="space-y-1.5">
                    <div
                        v-for="ls in languageStreaks"
                        :key="ls.lang"
                        class="flex items-center justify-between text-sm"
                    >
                        <span class="text-ink capitalize">{{ ls.lang }}</span>
                        <span class="font-mono text-xs text-muted">
                            <Flame :size="11" class="inline -mt-0.5 text-flame" />
                            {{ ls.streak }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Footer note -->
            <div class="pt-3 mt-3 border-t border-rule">
                <p class="text-[11px] text-muted text-center">
                    Streak counts any daily puzzle in any language.
                    <br />
                    Play once a day to keep it going.
                </p>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Flame } from 'lucide-vue-next';
import { isClassicDailyStatsKey } from '~/utils/game-modes';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const game = useGameStore();
const statsStore = useStatsStore();

// Respect debug override so badge and modal show the same number
const currentStreak = computed(() =>
    game.debugStreakOverride !== null
        ? game.debugStreakOverride
        : statsStore.totalStats.current_overall_streak
);
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

// Calendar heatmap: last 28 days
const calendarTitle = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('en', { month: 'long', year: 'numeric' });
});

interface CalendarDay {
    date: number | null;
    played: boolean;
    missed: boolean;
    today: boolean;
}

const calendarDays = computed<CalendarDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build set of played local dates from all classic daily results
    const playedDates = new Set<string>();
    for (const [key, results] of Object.entries(statsStore.gameResults)) {
        if (!isClassicDailyStatsKey(key)) continue;
        for (const r of results) {
            if (r.won) {
                playedDates.add(new Date(r.date as string).toLocaleDateString('en-CA'));
            }
        }
    }

    // Get first day of current month
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDow = (firstOfMonth.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const days: CalendarDay[] = [];

    // Empty slots before first day
    for (let i = 0; i < startDow; i++) {
        days.push({ date: null, played: false, missed: false, today: false });
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(today.getFullYear(), today.getMonth(), d);
        const key = dateObj.toLocaleDateString('en-CA');
        const isToday = d === today.getDate();
        const isPast = dateObj < today;
        const played = playedDates.has(key);

        days.push({
            date: d,
            played,
            missed: isPast && !played && !isToday,
            today: isToday,
        });
    }

    // Pad to complete the grid row
    while (days.length % 7 !== 0) {
        days.push({ date: null, played: false, missed: false, today: false });
    }

    return days;
});

// Per-language breakdown
const languageStreaks = computed(() => {
    const result: { lang: string; streak: number }[] = [];
    for (const [lang, stats] of Object.entries(statsStore.totalStats.game_stats)) {
        if (stats.current_streak > 0) {
            result.push({ lang, streak: stats.current_streak });
        }
    }
    return result.sort((a, b) => b.streak - a.streak);
});
</script>
