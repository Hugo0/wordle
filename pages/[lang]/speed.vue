<script setup lang="ts">
/**
 * Speed Streak Mode Page — /<lang>/speed
 *
 * Arcade-style timed mode: solve as many words as you can in 5 minutes.
 * +5s bonus per solved word. Dark theme, fast animations.
 */
import { createGameConfig } from '~/utils/game-modes';
import { Info } from 'lucide-vue-next';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-speed-${route.query.play}`,
});

const route = useRoute();
const lang = route.params.lang as string;

// Play type: daily (default — same word sequence for everyone) or unlimited (random)
const { playType, isDaily, isUnlimited } = usePlayType('speed');

const { data: gameData, error } = await useFetch(`/api/${lang}/data`, {
    key: `lang-data-speed-${lang}-${playType.value}`,
    query: { mode: 'speed', play: playType.value },
});
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

const {
    langStore,
    game,
    settings,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    gameBoardRef,
    config,
} = useGamePage(gameData, lang);

// Detect day rollover when tab regains focus
if (isDaily.value) {
    useDayRollover(lang, gameData.value!.todays_idx);
}

// --- SEO ---
const seo = useGameSeo({
    lang,
    mode: 'speed',
    config: config.value!,
    langStore,
});

// --- Countdown flow ---
const countdownNumber = ref<string | number>('');

function startCountdown() {
    // Daily speed: use deterministic word sequence from server (same for everyone)
    // Unlimited speed: use curated daily-tier words for random selection
    // speed_daily_words is returned by the API when mode=speed&play=daily
    const speedDailyWords = (gameData.value as Record<string, unknown>)?.speed_daily_words as
        | string[]
        | undefined;
    const wordList =
        isDaily.value && speedDailyWords?.length
            ? speedDailyWords
            : gameData.value!.daily_words?.length
              ? gameData.value!.daily_words
              : gameData.value!.word_list;
    game.startSpeedSession(wordList);

    countdownNumber.value = 3;
    setTimeout(() => {
        countdownNumber.value = 2;
    }, 1000);
    setTimeout(() => {
        countdownNumber.value = 1;
    }, 2000);
    setTimeout(() => {
        countdownNumber.value = langStore.config?.ui?.speed_go ?? 'GO!';
    }, 2700);
}

// --- Computed stats ---
const avgGuesses = computed(() => {
    const s = game.speedState;
    if (s.wordsSolved === 0) return '0';
    return (s.totalGuesses / s.wordsSolved).toFixed(1);
});

const avgTime = computed(() => {
    const s = game.speedState;
    if (s.wordsSolved === 0) return '0';
    const totalMs = s.solvedWords.reduce((sum, w) => sum + w.timeMs, 0);
    return (totalMs / s.wordsSolved / 1000).toFixed(1);
});

// Speed results visibility — separate from countdownPhase so it can be re-opened
const showSpeedResults = ref(false);

// Auto-show results when game finishes
watch(
    () => game.speedState.countdownPhase,
    (phase) => {
        if (phase === 'finished') showSpeedResults.value = true;
    }
);

// Override stats button to show speed results instead of navigating away
watch(
    () => game.showStatsModal,
    (show) => {
        if (show && game.speedState.countdownPhase === 'finished') {
            game.showStatsModal = false;
            showSpeedResults.value = true;
        }
    }
);

// Paper-aging background class based on urgency level
const speedBgClass = computed(() => {
    if (game.speedState.countdownPhase !== 'playing') return 'speed-mode';
    const u = game.speedState.urgencyLevel;
    if (u === 0) return 'speed-mode';
    if (u === 1) return 'speed-mode speed-warm';
    if (u === 2) return 'speed-mode speed-hot';
    return 'speed-mode speed-critical';
});

// Screen shake on fail
let shakeTimer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => game.speedState.lastEvent,
    (event) => {
        if (event === 'fail' && import.meta.client) {
            if (shakeTimer) clearTimeout(shakeTimer);
            document.documentElement.classList.add('speed-screen-shake');
            shakeTimer = setTimeout(() => {
                document.documentElement.classList.remove('speed-screen-shake');
                shakeTimer = null;
            }, 400);
        }
    }
);

onUnmounted(() => {
    if (shakeTimer) {
        clearTimeout(shakeTimer);
        document.documentElement.classList.remove('speed-screen-shake');
    }
});

// --- Play again ---
function playAgain() {
    game.resetSpeedState();
    game.resetForMode(createGameConfig('speed', lang, { wordLength: 5, playType: playType.value }));
}

// --- Share ---
const { shareResults: shareWithTracking } = useGameShare();

async function shareSpeed() {
    await shareWithTracking({
        shareText: game.getSpeedShareText(),
        langCode: lang,
        gameWon: true,
        attempts: String(game.speedState.wordsSolved),
        emojiBoard: '',
        gameMode: 'speed',
        onNotify: (msg) => game.showNotification(msg),
    });
}

// --- Client-side init (speed-specific) ---
onMounted(() => {
    game.resetForMode(createGameConfig('speed', lang, { wordLength: 5, playType: playType.value }));
    game.resetSpeedState();

    onUnmounted(() => {
        game.resetSpeedState();
    });
});
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="speed"
        :title="langStore.config?.ui?.speed_streak ?? 'Speed Streak'"
        :subtitle="
            isDaily
                ? `${config?.name_native || lang} · #${gameData?.mode_day_idx ?? gameData?.todays_idx}`
                : `${config?.name_native || lang} · ${langStore.config?.ui?.unlimited_mode}`
        "
        :sidebar-open="sidebarOpen ?? false"
        :visible="!!gameData"
        :inner-class="speedBgClass"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
    >
        <!-- Speed Timer -->
        <GameSpeedTimer
            v-if="game.speedState.countdownPhase === 'playing'"
            :time-remaining="game.speedState.timeRemaining"
            :total-time="game.speedState.totalTime"
            :last-time-delta="game.speedState.lastTimeDelta"
            :last-event="game.speedState.lastEvent"
            :score="game.speedState.score"
            :combo="game.speedState.combo"
            :tick-speed="game.speedState.tickSpeed"
        />

        <!-- Speed Ticker -->
        <GameSpeedTicker
            v-if="
                game.speedState.countdownPhase === 'playing' &&
                game.speedState.solvedWords.length > 0
            "
            :words="game.speedState.solvedWords"
        />

        <!-- Speed Stats Strip -->
        <GameSpeedStatsStrip
            v-if="game.speedState.countdownPhase === 'playing' && game.speedState.wordsSolved > 0"
            :solved="game.speedState.wordsSolved"
            :failed="game.speedState.wordsFailed"
            :avg-guesses="avgGuesses"
            :avg-time="avgTime"
        />

        <!-- Arcade feedback overlay -->
        <GameSpeedOverlay
            v-if="game.speedState.countdownPhase === 'playing'"
            :events="game.speedState.arcadeEvents"
            :last-event="game.speedState.lastEvent"
        />

        <!-- Idle/Countdown: inline start screen (no overlay, header/sidebar still accessible) -->
        <div
            v-if="
                game.speedState.countdownPhase === 'idle' ||
                game.speedState.countdownPhase === 'countdown'
            "
            class="flex flex-auto items-center justify-center px-4"
        >
            <div v-if="game.speedState.countdownPhase === 'idle'" class="text-center">
                <div class="heading-display text-5xl text-ink mb-6">
                    {{ langStore.config?.ui?.speed_streak }}
                </div>
                <button
                    class="speed-start-btn px-10 py-3.5 bg-accent text-paper font-body font-bold text-lg hover:opacity-90 transition-opacity relative overflow-hidden"
                    @click="startCountdown"
                >
                    <span class="relative z-10">{{ langStore.config?.ui?.speed_start }}</span>
                </button>
                <p class="text-muted text-xs mt-4 flex items-center justify-center gap-1">
                    {{ langStore.config?.ui?.speed_tap_for_rules?.split('{icon}')?.[0]
                    }}<Info :size="14" />{{
                        langStore.config?.ui?.speed_tap_for_rules?.split('{icon}')?.[1]
                    }}
                </p>
            </div>
            <div v-else class="text-center">
                <span
                    :key="countdownNumber"
                    class="speed-countdown-number text-8xl font-display font-bold"
                    :class="typeof countdownNumber === 'string' ? 'text-correct' : 'text-ink'"
                >
                    {{ countdownNumber }}
                </span>
            </div>
        </div>

        <!-- Playing/Finished: show the game board -->
        <GameBoard v-else ref="gameBoardRef" />

        <template #overlays>
            <!-- Results modal (only when finished, doesn't block header) -->
            <GameSpeedResults
                :visible="showSpeedResults"
                :solved="game.speedState.wordsSolved"
                :failed="game.speedState.wordsFailed"
                :avg-guesses="avgGuesses"
                :avg-time="avgTime"
                :score="game.speedState.score"
                :max-combo="game.speedState.maxCombo"
                :last-missed-word="game.speedState.lastMissedWord"
                :words="game.speedState.solvedWords"
                @play-again="playAgain"
                @share="shareSpeed"
                @close="showSpeedResults = false"
            />
        </template>
        <template #seo>
            <GameSeoNoscript :lang="lang" mode="speed" :seo="seo" :config="config!" />
        </template>
    </GamePageShell>
</template>
