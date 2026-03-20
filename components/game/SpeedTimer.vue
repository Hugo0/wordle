<script setup lang="ts">
const props = defineProps<{
    timeRemaining: number;
    totalTime: number;
    lastTimeDelta: number;
    lastEvent: string;
    score: number;
    combo: number;
    tickSpeed: number;
}>();

// Flash feedback for time changes
const flashVisible = ref(false);
const flashText = ref('');
const flashPositive = ref(true);
let flashTimeout: ReturnType<typeof setTimeout> | null = null;

watch(
    () => props.lastEvent,
    (event) => {
        if (event === 'none') return;
        const delta = props.lastTimeDelta;
        if (delta === 0) return;
        flashPositive.value = delta > 0;
        flashText.value = delta > 0 ? `+${delta / 1000}s` : `${delta / 1000}s`;
        flashVisible.value = true;
        if (flashTimeout) clearTimeout(flashTimeout);
        flashTimeout = setTimeout(() => {
            flashVisible.value = false;
        }, 800);
    }
);

const fillPercent = computed(() => {
    if (props.totalTime <= 0) return 0;
    return Math.min(100, (props.timeRemaining / props.totalTime) * 100);
});

const barColorClass = computed(() => {
    const pct = fillPercent.value;
    if (pct > 60) return 'green';
    if (pct > 30) return 'yellow';
    if (pct > 10) return 'red';
    return 'critical';
});

function formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
</script>

<template>
    <div class="px-3 py-1.5">
        <!-- Score + combo + timer -->
        <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-sm text-ink">
                    {{ score.toLocaleString() }}
                </span>
                <span v-if="combo > 1" class="font-mono text-[10px] font-bold text-accent">
                    {{ combo }}x
                </span>
            </div>

            <!-- Time delta flash -->
            <span
                v-if="flashVisible"
                class="speed-bonus-float font-mono text-xs font-bold"
                :class="flashPositive ? 'text-correct' : 'text-accent'"
            >
                {{ flashText }}
            </span>

            <div class="flex items-center gap-2">
                <span v-if="tickSpeed > 1" class="font-mono text-[9px] text-accent">
                    {{ tickSpeed.toFixed(1) }}x
                </span>
                <span class="font-mono text-xs text-ink font-semibold">
                    {{ formatTime(timeRemaining) }}
                </span>
            </div>
        </div>

        <!-- Timer bar with flash effect -->
        <div
            class="speed-timer-bar"
            :class="{
                'speed-bar-flash-green': lastEvent === 'solve',
                'speed-bar-flash-red': lastEvent === 'fail',
            }"
        >
            <div
                class="speed-timer-fill"
                :class="barColorClass"
                :style="{ width: fillPercent + '%' }"
            />
        </div>
    </div>
</template>

<style scoped>
.speed-bar-flash-green {
    animation: barFlashGreen 0.5s ease-out;
}
.speed-bar-flash-red {
    animation: barFlashRed 0.5s ease-out;
}

@keyframes barFlashGreen {
    0% {
        box-shadow: 0 0 12px 2px var(--color-correct);
    }
    100% {
        box-shadow: none;
    }
}
@keyframes barFlashRed {
    0% {
        box-shadow: 0 0 12px 2px var(--color-accent);
    }
    100% {
        box-shadow: none;
    }
}
</style>
