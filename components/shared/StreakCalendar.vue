<!--
  StreakCalendar — 28-day rolling heatmap with mode icons + language flags.

  Shared between StreakModal and profile page. Shows daily activity:
  - Cell background: won (green), lost (pink), missed (gray), today (outlined)
  - Mode icons: top row, up to 3 visible + overflow count
  - Language flags: bottom row, up to 3 visible + overflow count

  Props:
  - gameResults: the raw game results record (from stats store)
  - bestStreak: shown in the "Best" subtitle at top (optional)
-->
<template>
    <div>
        <!-- Header -->
        <div class="mono-label mb-2" style="font-size: 9px; letter-spacing: 0.15em">
            {{ ui?.last_28_days }}
        </div>

        <!-- Day-of-week headers -->
        <div
            class="grid grid-cols-7 gap-0.5 mb-1"
            style="font-family: var(--font-mono); font-size: 8px; color: var(--color-muted)"
        >
            <span v-for="(d, i) in weekdayInitials" :key="i" class="text-center">
                {{ d }}
            </span>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7 gap-0.5">
            <div
                v-for="(day, i) in calendarDays"
                :key="i"
                class="aspect-square rounded-sm relative overflow-hidden"
                :class="dayClass(day)"
            >
                <!-- Date number -->
                <span
                    v-if="day.date"
                    class="cal-date"
                    :class="day.modes.length > 0 ? 'cal-date-active' : 'cal-date-empty'"
                >
                    {{ day.date }}
                </span>

                <!-- Mode icons row (top area, below date) -->
                <div v-if="day.modes.length > 0" class="cal-modes">
                    <component
                        :is="getModeIcon(m)"
                        v-for="m in day.modes.slice(0, 3)"
                        :key="m"
                        :size="9"
                        class="cal-icon"
                        :class="day.wonModes.has(m) ? 'cal-icon-won' : 'cal-icon-lost'"
                    />
                    <span v-if="day.modes.length > 3" class="cal-overflow">
                        +{{ day.modes.length - 3 }}
                    </span>
                </div>

                <!-- Language flags row (bottom area) -->
                <div v-if="day.langs.length > 0" class="cal-langs">
                    <img
                        v-for="lang in day.langs.slice(0, 3)"
                        :key="lang"
                        :src="flagSrc(lang)!"
                        :alt="lang"
                        class="cal-flag-img"
                        :class="{ 'cal-flag-lost': !day.wonLangs.has(lang) }"
                    />
                    <span v-if="day.langs.length > 3" class="cal-overflow">
                        +{{ day.langs.length - 3 }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Legend -->
        <div
            class="flex gap-3 mt-2 justify-center"
            style="font-size: 9px; color: var(--color-muted); font-family: var(--font-mono)"
        >
            <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-sm bg-correct-soft inline-block" /> {{ ui?.won }}
            </span>
            <span class="flex items-center gap-1">
                <span
                    class="w-2 h-2 rounded-sm inline-block"
                    style="background: var(--color-accent-soft, #e8d5d0)"
                />
                {{ ui?.lost }}
            </span>
            <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-sm bg-muted-soft inline-block" /> {{ ui?.missed }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Square } from 'lucide-vue-next';
import { useFlag } from '~/composables/useFlag';
import { toLocalDay, buildDailyResultMapDetailed } from '~/utils/streak-dates';
import { GAME_MODES_UI } from '~/composables/useGameModes';
import type { GameResult } from '~/utils/types';

const props = defineProps<{
    gameResults: Record<string, GameResult[]>;
}>();

const langStore = useLanguageStore();
const ui = computed(() => langStore.config?.ui);
const weekdayInitials = computed(() => {
    const raw = ui.value?.weekday_initials ?? '';
    return raw.split(',');
});

// --- Helpers ---

const _flagCache = new Map<string, string | null>();
function flagSrc(code: string): string | null {
    if (_flagCache.has(code)) return _flagCache.get(code)!;
    const f = useFlag(code);
    _flagCache.set(code, f);
    return f;
}

function getModeIcon(mode: string | undefined) {
    if (!mode) return Square;
    return GAME_MODES_UI.find((m) => m.id === mode)?.icon || Square;
}

// --- Calendar data ---

interface CalendarDay {
    date: number | null;
    state: 'won' | 'lost' | 'missed' | 'today' | 'future' | 'empty';
    isToday: boolean;
    modes: string[];
    langs: string[];
    wonModes: Set<string>;
    wonLangs: Set<string>;
}

function dayClass(day: CalendarDay): string {
    const todayRing = day.isToday ? ' outline outline-2 outline-ink -outline-offset-1' : '';
    switch (day.state) {
        case 'won':
            return 'bg-correct-soft' + todayRing;
        case 'lost':
            return 'cal-lost' + todayRing;
        case 'missed':
            return 'bg-muted-soft' + todayRing;
        case 'today':
            return 'outline outline-2 outline-ink -outline-offset-1';
        default:
            return '';
    }
}

const calendarDays = computed<CalendarDay[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayDetails = buildDailyResultMapDetailed(props.gameResults);

    // Align to full weeks: end on this week's Sunday
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
        const detail = dayDetails.get(dayKey);

        let state: CalendarDay['state'];
        if (isToday) {
            state = detail?.state ?? 'today';
        } else if (isFuture) {
            state = 'future';
        } else {
            state = detail?.state ?? 'missed';
        }

        days.push({
            date: d.getDate(),
            state,
            isToday,
            modes: detail ? [...detail.modes] : [],
            langs: detail ? [...detail.langs].filter((l) => flagSrc(l)) : [],
            wonModes: detail?.wonModes ?? new Set(),
            wonLangs: detail?.wonLangs ?? new Set(),
        });
    }

    return days;
});
</script>

<style scoped>
.cal-lost {
    background: var(--color-accent-soft, #e8d5d0);
}

.cal-date {
    font-family: var(--font-mono);
    line-height: 1;
    color: var(--color-muted);
}
.cal-date-active {
    position: absolute;
    top: 1px;
    left: 2px;
    font-size: 7px;
}
.cal-date-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
}

/* Mode icons: upper half of cell (below date) */
.cal-modes {
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 1px;
    align-items: center;
}
.cal-icon {
    flex-shrink: 0;
}
.cal-icon-won {
    color: var(--color-ink);
    opacity: 0.7;
}
.cal-icon-lost {
    color: var(--color-muted);
    opacity: 0.35;
}

/* Language flags: lower half of cell */
.cal-langs {
    position: absolute;
    top: 65%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 1px;
    align-items: center;
}
.cal-flag-img {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}
.cal-flag-lost {
    opacity: 0.35;
    filter: grayscale(0.6);
}

.cal-overflow {
    font-family: var(--font-mono);
    font-size: 6px;
    color: var(--color-muted);
    line-height: 1;
}
</style>
